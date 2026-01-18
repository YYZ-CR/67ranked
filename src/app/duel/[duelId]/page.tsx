'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { HandTracker, RepCounter, CalibrationTracker } from '@/lib/hand-tracking';
import { CalibrationOverlay } from '@/components/game/CalibrationOverlay';
import { CountdownOverlay } from '@/components/game/CountdownOverlay';
import { GameOverlay } from '@/components/game/GameOverlay';
import { is67RepsMode } from '@/types/game';

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
  const [displayRepCount, setDisplayRepCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const gameEndedRef = useRef(false);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_players', filter: `duel_id=eq.${duelId}` }, async () => {
        // Fetch updated players
        const res = await fetch(`/api/duel/${duelId}`);
        const data = await res.json();
        setPlayers(data.players);
        
        // If we're in results and waiting for opponent, check if they've submitted
        if (pageState === 'results' && !result?.opponentScore) {
          const myPlayer = data.players.find((p: DuelPlayer) => p.player_key === myPlayerKey);
          const opponent = data.players.find((p: DuelPlayer) => p.player_key !== myPlayerKey);
          
          if (myPlayer?.score !== null && opponent?.score !== null) {
            // Both have submitted - calculate result
            const is67Reps = duel && is67RepsMode(duel.duration_ms);
            let outcome: 'win' | 'lose' | 'tie' = 'tie';
            
            if (is67Reps) {
              // Lower time wins
              if (myPlayer.score < opponent.score) outcome = 'win';
              else if (myPlayer.score > opponent.score) outcome = 'lose';
            } else {
              // Higher reps wins
              if (myPlayer.score > opponent.score) outcome = 'win';
              else if (myPlayer.score < opponent.score) outcome = 'lose';
            }
            
            setResult({
              myScore: myPlayer.score,
              opponentScore: opponent.score,
              outcome
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [duelId, pageState, myPlayerKey, result, duel]);

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
  const endGame = useCallback(async (finalElapsedMs?: number) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const currentDuel = duelDataRef.current;
    const is67Reps = currentDuel && is67RepsMode(currentDuel.duration_ms);

    // For 67 reps mode, score is the elapsed time in ms
    // For timed modes, score is the rep count
    let score: number;
    if (is67Reps) {
      // Use the exact captured time, rounded for consistency
      score = Math.round(finalElapsedMs ?? elapsedTime);
      setDisplayRepCount(67);
      setElapsedTime(score); // Update for consistent display
    } else {
      score = trackerRef.current?.getRepCount() || repCountRef.current || 0;
    }
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
  }, [elapsedTime]);

  // Start gameplay
  const startGameplay = useCallback(() => {
    const currentDuel = duelDataRef.current;
    if (!currentDuel) return;

    const is67Reps = is67RepsMode(currentDuel.duration_ms);

    // Reset using the tracker's internal rep counter
    trackerRef.current?.resetRepCounter();
    repCountRef.current = 0;
    setDisplayRepCount(0);
    setElapsedTime(0);
    gameEndedRef.current = false;
    
    if (!is67Reps) {
      setTimeRemaining(currentDuel.duration_ms);
    }
    setPageState('playing');

    const startTime = performance.now();
    const durationMs = currentDuel.duration_ms;

    const gameLoop = () => {
      const elapsed = performance.now() - startTime;
      
      if (is67Reps) {
        setElapsedTime(elapsed);
      } else {
        const remaining = Math.max(0, durationMs - elapsed);
        setTimeRemaining(remaining);
      }

      // Use the tracker's built-in pose-based rep counting
      if (trackerRef.current && !gameEndedRef.current) {
        trackerRef.current.processGameplay(null, null);
        const currentReps = trackerRef.current.getRepCount();
        repCountRef.current = currentReps;
        setDisplayRepCount(currentReps);

        // Check if 67 reps reached
        if (is67Reps && currentReps >= 67) {
          gameEndedRef.current = true;
          endGame(Math.round(elapsed));
          return;
        }
      }

      if (is67Reps) {
        // 67 reps mode continues until 67 reps are hit
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      } else {
        // Timed modes end when time runs out
        const remaining = Math.max(0, durationMs - elapsed);
        if (remaining > 0) {
          animationFrameRef.current = requestAnimationFrame(gameLoop);
        } else {
          endGame();
        }
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

  // Track state for calibration effect
  const [trackingState, setTrackingState] = useState<{ bothHandsDetected: boolean } | null>(null);

  // Initialize camera - only sets up tracking, doesn't handle calibration
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
          setTrackingState(state);
        }
      );

      tracker.start();
    } catch {
      setError('Failed to access camera');
      setPageState('error');
    }
  }, []);

  // Start camera when entering calibration
  useEffect(() => {
    if (pageState === 'calibrating') {
      initializeCamera();
    }
  }, [pageState, initializeCamera]);

  // Handle calibration in a separate effect (like normal GamePanel does)
  useEffect(() => {
    if (pageState !== 'calibrating' || !calibrationTrackerRef.current || !trackingState) return;

    const calibrated = calibrationTrackerRef.current.processFrame(trackingState.bothHandsDetected);
    if (calibrated) {
      startCountdown();
    }
  }, [pageState, trackingState, startCountdown]);

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
            <p className="text-white/50 text-sm">Mode</p>
            <p className="text-2xl font-bold text-white">
              {duel?.duration_ms 
                ? is67RepsMode(duel.duration_ms) 
                  ? '67 Reps ⚡' 
                  : `${(duel.duration_ms / 1000).toFixed(1)}s`
                : '...'}
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
  const containerSize = 400;
  
  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
      <div 
        className="relative rounded-2xl overflow-hidden bg-gray-900 ring-2 ring-accent-green/30 shadow-[0_0_30px_rgba(74,222,128,0.15)]"
        style={{ width: containerSize, height: containerSize }}
      >
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
          width={containerSize}
          height={containerSize}
          className="absolute inset-0 w-full h-full"
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
            repCount={displayRepCount}
            timeRemaining={timeRemaining}
            elapsedTime={elapsedTime}
            is67RepsMode={duel ? is67RepsMode(duel.duration_ms) : false}
            trackingLost={trackingLost}
          />
        )}

        {pageState === 'results' && (() => {
          const is67Reps = duel && is67RepsMode(duel.duration_ms);
          const formatTime = (ms: number) => (ms / 1000).toFixed(2) + 's';
          const myPlayer = players.find(p => p.player_key === myPlayerKey);
          const opponent = players.find(p => p.player_key !== myPlayerKey);
          
          const handleShareResult = async () => {
            const myName = myPlayer?.username || 'Player 1';
            const oppName = opponent?.username || 'Player 2';
            const myScoreText = is67Reps ? formatTime(finalScore) : `${finalScore} reps`;
            const oppScoreText = result?.opponentScore != null 
              ? (is67Reps ? formatTime(result.opponentScore) : `${result.opponentScore} reps`)
              : 'pending';
            
            const outcomeText = result?.outcome === 'win' ? 'won against' 
              : result?.outcome === 'lose' ? 'lost to' 
              : 'tied with';
            
            const duelUrl = `${window.location.origin}/duel/${duelId}/results`;
            const shareText = `⚔️ 67Ranked Duel!\n${myName} ${outcomeText} ${oppName}\n${myScoreText} vs ${oppScoreText}`;
            
            if (navigator.share) {
              try {
                await navigator.share({
                  title: '67Ranked Duel Result',
                  text: shareText,
                  url: duelUrl
                });
              } catch {
                // User cancelled
              }
            } else {
              await navigator.clipboard.writeText(`${shareText}\n\n${duelUrl}`);
              alert('Result copied to clipboard!');
            }
          };
          
          return (
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
                    <p className="text-white/60 text-sm">{myPlayer?.username || 'You'}</p>
                    <p className="text-3xl font-bold text-white">
                      {is67Reps ? formatTime(finalScore) : finalScore}
                    </p>
                    {is67Reps && <p className="text-white/40 text-xs">67 reps</p>}
                  </div>
                  <div className="text-white/40 text-2xl self-center">vs</div>
                  <div className="text-center">
                    <p className="text-white/60 text-sm">{opponent?.username || 'Opponent'}</p>
                    <p className="text-3xl font-bold text-white">
                      {result?.opponentScore != null 
                        ? (is67Reps ? formatTime(result.opponentScore) : result.opponentScore)
                        : '...'}
                    </p>
                    {is67Reps && result?.opponentScore != null && <p className="text-white/40 text-xs">67 reps</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleShareResult}
                    className="px-6 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share Result
                  </button>
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
          );
        })()}
      </div>
    </main>
  );
}
