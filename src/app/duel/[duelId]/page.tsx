'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { HandTracker, RepCounter, CalibrationTracker } from '@/lib/hand-tracking';
import { CalibrationOverlay } from '@/components/game/CalibrationOverlay';
import { CountdownOverlay } from '@/components/game/CountdownOverlay';
import { GameOverlay } from '@/components/game/GameOverlay';

interface DuelData {
  id: string;
  duration_ms: number;
  status: string;
  start_at: number | null;
}

interface DuelPlayer {
  player_key: string;
  username: string;
  ready: boolean;
  score: number | null;
}

type PageState = 'loading' | 'join' | 'lobby' | 'calibrating' | 'countdown' | 'playing' | 'results' | 'error';

export default function DuelPage() {
  const params = useParams();
  const router = useRouter();
  const duelId = params.duelId as string;

  // Refs for game
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const repCounterRef = useRef<RepCounter | null>(null);
  const calibrationTrackerRef = useRef<CalibrationTracker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const repCountRef = useRef<number>(0);
  const sessionTokenRef = useRef<string | null>(null);
  const duelDataRef = useRef<DuelData | null>(null);

  // State
  const [pageState, setPageState] = useState<PageState>('loading');
  const [duel, setDuel] = useState<DuelData | null>(null);
  const [players, setPlayers] = useState<DuelPlayer[]>([]);
  const [myPlayerKey, setMyPlayerKey] = useState<string | null>(null);
  const [joinUsername, setJoinUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [trackingLost, setTrackingLost] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [result, setResult] = useState<{ myScore: number; opponentScore: number; outcome: string } | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Keep duel ref in sync
  useEffect(() => {
    duelDataRef.current = duel;
  }, [duel]);

  // Load duel data
  useEffect(() => {
    const loadDuel = async () => {
      try {
        const response = await fetch(`/api/duel/${duelId}`);
        if (!response.ok) {
          throw new Error('Duel not found');
        }
        const data = await response.json();
        setDuel(data.duel);
        setPlayers(data.players);
        setShareUrl(window.location.href);

        const storedKey = sessionStorage.getItem(`duel_${duelId}_player_key`);
        if (storedKey) {
          setMyPlayerKey(storedKey);
          if (data.duel.status === 'waiting') {
            setPageState('lobby');
          } else if (data.duel.status === 'active') {
            setPageState('calibrating');
          } else if (data.duel.status === 'complete') {
            setPageState('results');
          }
        } else if (data.players.length >= 2) {
          setError('This duel is full');
          setPageState('error');
        } else {
          setPageState('join');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load duel');
        setPageState('error');
      }
    };

    loadDuel();
  }, [duelId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!duelId) return;

    const channel = supabase
      .channel(`duel:${duelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `id=eq.${duelId}` }, (payload) => {
        const newDuel = payload.new as DuelData;
        setDuel(newDuel);
        
        if (newDuel.status === 'active' && pageState === 'lobby') {
          setPageState('calibrating');
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_players', filter: `duel_id=eq.${duelId}` }, () => {
        fetch(`/api/duel/${duelId}`)
          .then(res => res.json())
          .then(data => setPlayers(data.players));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [duelId, pageState]);

  // Join duel
  const handleJoin = async () => {
    if (!joinUsername.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch('/api/duel/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId,
          username: joinUsername.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join duel');
      }

      const data = await response.json();
      sessionStorage.setItem(`duel_${duelId}_player_key`, data.player_key);
      setMyPlayerKey(data.player_key);
      setPageState('lobby');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join duel');
    } finally {
      setIsJoining(false);
    }
  };

  // Toggle ready
  const handleReady = async () => {
    if (!myPlayerKey) return;

    const myPlayer = players.find(p => p.player_key === myPlayerKey);
    const newReady = !myPlayer?.ready;

    try {
      await fetch('/api/duel/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId,
          player_key: myPlayerKey,
          ready: newReady
        })
      });

      const allReady = players.every(p => p.player_key === myPlayerKey ? newReady : p.ready) && players.length === 2;
      if (allReady) {
        await fetch('/api/duel/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duelId })
        });
      }
    } catch (err) {
      console.error('Ready error:', err);
    }
  };

  // End game callback
  const endGame = useCallback(async () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const score = repCounterRef.current?.getRepCount() || 0;
    setFinalScore(score);

    if (sessionTokenRef.current) {
      try {
        const response = await fetch('/api/duel/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: sessionTokenRef.current,
            score
          })
        });

        const data = await response.json();
        if (data.status === 'complete') {
          setResult({
            myScore: data.result.myScore,
            opponentScore: data.result.opponentScore,
            outcome: data.result.outcome
          });
        }
      } catch (err) {
        console.error('Submit error:', err);
      }
    }

    setPageState('results');
  }, []);

  // Start gameplay
  const startGameplay = useCallback(() => {
    const currentDuel = duelDataRef.current;
    if (!currentDuel) return;

    repCounterRef.current?.reset();
    repCountRef.current = 0;
    setTimeRemaining(currentDuel.duration_ms);
    setPageState('playing');

    const startTime = performance.now();
    const durationMs = currentDuel.duration_ms;

    const gameLoop = () => {
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, durationMs - elapsed);
      setTimeRemaining(remaining);

      if (trackerRef.current && repCounterRef.current) {
        const results = trackerRef.current.getLastResults();
        if (results?.multiHandLandmarks && results?.multiHandedness) {
          let leftLandmarks = null;
          let rightLandmarks = null;

          for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i];
            const isLeftHand = handedness.label === 'Right';

            if (isLeftHand) leftLandmarks = landmarks;
            else rightLandmarks = landmarks;
          }

          const repCompleted = repCounterRef.current.processFrame(leftLandmarks, rightLandmarks);
          if (repCompleted) {
            repCountRef.current = repCounterRef.current.getRepCount();
          }
        }
      }

      if (remaining > 0) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      } else {
        endGame();
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [endGame]);

  // Start countdown when calibration is done
  const startCountdown = useCallback(async () => {
    if (!myPlayerKey || !duel) return;

    try {
      const response = await fetch('/api/duel/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId,
          player_key: myPlayerKey
        })
      });

      if (!response.ok) throw new Error('Failed to get session');
      const data = await response.json();
      sessionTokenRef.current = data.token;

      const serverStartAt = data.start_at;
      const now = Date.now();
      const delay = Math.max(0, serverStartAt - now);

      setPageState('countdown');
      
      let count = Math.ceil(delay / 1000);
      setCountdownValue(Math.min(count, 5));

      const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdownValue(count);
        } else {
          clearInterval(countdownInterval);
          setCountdownValue(0);
          setTimeout(() => startGameplay(), 500);
        }
      }, 1000);
    } catch (err) {
      console.error('Session error:', err);
    }
  }, [duelId, myPlayerKey, duel, startGameplay]);

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const tracker = new HandTracker();
      trackerRef.current = tracker;
      repCounterRef.current = new RepCounter();
      calibrationTrackerRef.current = new CalibrationTracker();

      await tracker.initialize(
        videoRef.current,
        canvasRef.current,
        (state) => {
          setTrackingLost(!state.bothHandsDetected);
          
          if (pageState === 'calibrating' && calibrationTrackerRef.current) {
            const calibrated = calibrationTrackerRef.current.processFrame(state.bothHandsDetected);
            if (calibrated) {
              startCountdown();
            }
          }
        }
      );

      tracker.start();
    } catch {
      setError('Failed to access camera');
      setPageState('error');
    }
  }, [pageState, startCountdown]);

  // Start camera when entering calibration
  useEffect(() => {
    if (pageState === 'calibrating') {
      initializeCamera();
    }
  }, [pageState, initializeCamera]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (trackerRef.current) {
        trackerRef.current.cleanup();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Copy share link
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render based on state
  if (pageState === 'loading') {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </main>
    );
  }

  if (pageState === 'error') {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
        <div className="glass-panel p-6 rounded-2xl max-w-md w-full text-center">
          <div className="text-5xl mb-4">😔</div>
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-white/70 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-xl bg-accent-green text-black font-semibold"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  if (pageState === 'join') {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
        <div className="glass-panel p-6 rounded-2xl max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">⚔️ Duel Challenge</h1>
          <p className="text-white/60 text-center mb-6">
            {players[0]?.username} is challenging you!
          </p>

          <div className="mb-4 p-4 bg-white/5 rounded-xl text-center">
            <p className="text-white/50 text-sm">Duration</p>
            <p className="text-2xl font-bold text-white">
              {duel?.duration_ms ? `${(duel.duration_ms / 1000).toFixed(1)}s` : '...'}
            </p>
          </div>

          <div className="mb-6">
            <label className="text-white/70 text-sm mb-2 block">Your Name</label>
            <input
              type="text"
              value={joinUsername}
              onChange={(e) => setJoinUsername(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-green"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

          <button
            onClick={handleJoin}
            disabled={isJoining || !joinUsername.trim()}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              isJoining || !joinUsername.trim()
                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                : 'bg-accent-green text-black hover:bg-accent-green/90'
            }`}
          >
            {isJoining ? 'Joining...' : 'Accept Duel'}
          </button>
        </div>
      </main>
    );
  }

  if (pageState === 'lobby') {
    const myPlayer = players.find(p => p.player_key === myPlayerKey);
    const opponent = players.find(p => p.player_key !== myPlayerKey);

    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
        <div className="glass-panel p-6 rounded-2xl max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">⚔️ Duel Lobby</h1>

          <div className="space-y-3 mb-6">
            {myPlayer && (
              <div className={`p-4 rounded-xl ${myPlayer.ready ? 'bg-accent-green/20 border border-accent-green/50' : 'bg-white/5'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{myPlayer.username} (You)</span>
                  <span className={myPlayer.ready ? 'text-accent-green' : 'text-white/50'}>
                    {myPlayer.ready ? '✓ Ready' : 'Not Ready'}
                  </span>
                </div>
              </div>
            )}

            {opponent ? (
              <div className={`p-4 rounded-xl ${opponent.ready ? 'bg-accent-green/20 border border-accent-green/50' : 'bg-white/5'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{opponent.username}</span>
                  <span className={opponent.ready ? 'text-accent-green' : 'text-white/50'}>
                    {opponent.ready ? '✓ Ready' : 'Not Ready'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/5 border-2 border-dashed border-white/20">
                <p className="text-white/50 text-center">Waiting for opponent...</p>
              </div>
            )}
          </div>

          {!opponent && (
            <div className="mb-6">
              <p className="text-white/70 text-sm mb-2">Share this link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white/70 text-sm"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleReady}
            disabled={!opponent}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              !opponent
                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                : myPlayer?.ready
                  ? 'bg-red-500/80 text-white hover:bg-red-500'
                  : 'bg-accent-green text-black hover:bg-accent-green/90'
            }`}
          >
            {myPlayer?.ready ? 'Cancel Ready' : 'Ready!'}
          </button>

          {opponent && players.every(p => p.ready) && (
            <p className="text-accent-green text-center mt-4 animate-pulse">
              Starting game...
            </p>
          )}
        </div>
      </main>
    );
  }

  // Game states (calibrating, countdown, playing, results)
  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
      <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden bg-gray-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover opacity-0"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {pageState === 'calibrating' && calibrationTrackerRef.current && (
          <CalibrationOverlay
            progress={calibrationTrackerRef.current.getProgress()}
            bothHandsDetected={!trackingLost}
          />
        )}

        {pageState === 'countdown' && (
          <CountdownOverlay value={countdownValue} />
        )}

        {pageState === 'playing' && (
          <GameOverlay
            repCount={repCountRef.current}
            timeRemaining={timeRemaining}
            trackingLost={trackingLost}
          />
        )}

        {pageState === 'results' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="glass-panel p-6 rounded-2xl text-center">
              <div className={`text-4xl font-black mb-4 ${
                result?.outcome === 'win' ? 'text-accent-green' :
                result?.outcome === 'lose' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {result?.outcome === 'win' ? '🎉 YOU WIN!' :
                 result?.outcome === 'lose' ? '😔 YOU LOSE' : '🤝 TIE!'}
              </div>

              <div className="flex justify-center gap-8 mb-6">
                <div className="text-center">
                  <p className="text-white/60 text-sm">You</p>
                  <p className="text-3xl font-bold text-white">{finalScore}</p>
                </div>
                <div className="text-white/40 text-2xl self-center">vs</div>
                <div className="text-center">
                  <p className="text-white/60 text-sm">Opponent</p>
                  <p className="text-3xl font-bold text-white">{result?.opponentScore ?? '...'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => router.push('/duel/create')}
                  className="px-6 py-3 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-600"
                >
                  🔄 Rematch
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
