'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { HandTracker, RepCounter, CalibrationTracker } from '@/lib/hand-tracking';
import { CalibrationOverlay } from '@/components/game/CalibrationOverlay';
import { CountdownOverlay } from '@/components/game/CountdownOverlay';
import { GameOverlay } from '@/components/game/GameOverlay';
import { Header } from '@/components/ui/Header';
import { is67RepsMode, DURATION_6_7S, DURATION_20S, DURATION_67_REPS } from '@/types/game';

// Icons
const CopyIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="9,22 9,12 15,12 15,22" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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
  rankStats?: { dailyRank: number; allTimeRank: number; percentile: number } | null;
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
  const [result, setResult] = useState<{ 
    myScore: number; 
    opponentScore: number; 
    outcome: string;
    myRankStats?: { dailyRank: number; allTimeRank: number; percentile: number } | null;
    opponentRankStats?: { dailyRank: number; allTimeRank: number; percentile: number } | null;
  } | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [displayRepCount, setDisplayRepCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const gameEndedRef = useRef(false);
  const [containerSize, setContainerSize] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);

  // Keep duel ref in sync
  useEffect(() => {
    duelDataRef.current = duel;
  }, [duel]);

  // Fetch stats for player count
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setTotalPlayers(data.totalPlayers || 0);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, []);

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
            // Load the result from fetched data
            const myPlayer = data.players.find((p: DuelPlayer) => p.player_key === storedKey);
            const opponent = data.players.find((p: DuelPlayer) => p.player_key !== storedKey);
            
            // Verify we found both players
            if (myPlayer && opponent && myPlayer.score !== null && opponent.score !== null) {
              const is67Reps = is67RepsMode(data.duel.duration_ms);
              let outcome: 'win' | 'lose' | 'tie' = 'tie';
              
              if (is67Reps) {
                if (myPlayer.score < opponent.score) outcome = 'win';
                else if (myPlayer.score > opponent.score) outcome = 'lose';
              } else {
                if (myPlayer.score > opponent.score) outcome = 'win';
                else if (myPlayer.score < opponent.score) outcome = 'lose';
              }
              
              setFinalScore(myPlayer.score);
              setResult({
                myScore: myPlayer.score,
                opponentScore: opponent.score,
                outcome,
                myRankStats: myPlayer.rankStats,
                opponentRankStats: opponent.rankStats
              });
              setPageState('results');
            } else if (!myPlayer) {
              // Stored key doesn't match any player - redirect to results page
              router.push(`/duel/${duelId}/results`);
            } else {
              setPageState('results');
            }
          }
        } else if (data.duel.status === 'complete') {
          // No stored key but duel is complete - redirect to results page
          router.push(`/duel/${duelId}/results`);
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
              outcome,
              myRankStats: myPlayer.rankStats,
              opponentRankStats: opponent.rankStats
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

    let score: number;
    if (is67Reps) {
      score = Math.round(finalElapsedMs ?? elapsedTime);
      setDisplayRepCount(67);
      setElapsedTime(score);
    } else {
      score = trackerRef.current?.getRepCount() || repCountRef.current || 0;
      
      // Sanity check: cap score at reasonable maximum based on duration
      // Even the fastest humanly possible is ~15 reps/second, so max ~100 for 6.7s, ~300 for 20s
      if (currentDuel) {
        const durationSec = currentDuel.duration_ms / 1000;
        const maxReasonableScore = Math.ceil(durationSec * 20); // 20 reps/sec is superhuman
        if (score > maxReasonableScore) {
          console.warn(`[67ranked] Score ${score} exceeds max reasonable ${maxReasonableScore}, capping`);
          score = maxReasonableScore;
        }
      }
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
            outcome: data.result.outcome,
            myRankStats: data.result.myRankStats,
            opponentRankStats: data.result.opponentRankStats
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
    let pausedTime = 0;
    let lastFrameTime = startTime;

    const gameLoop = () => {
      const now = performance.now();
      const frameDelta = now - lastFrameTime;
      
      // Detect if tab was backgrounded (frame took >500ms = likely paused)
      if (frameDelta > 500) {
        pausedTime += frameDelta;
        console.log('[67ranked] Detected pause, adding', frameDelta, 'ms to paused time');
      }
      lastFrameTime = now;
      
      const elapsed = now - startTime - pausedTime;
      
      if (is67Reps) {
        setElapsedTime(elapsed);
      } else {
      const remaining = Math.max(0, durationMs - elapsed);
      setTimeRemaining(remaining);
      }

      if (trackerRef.current && !gameEndedRef.current) {
        trackerRef.current.processGameplay(null, null);
        const currentReps = trackerRef.current.getRepCount();
        repCountRef.current = currentReps;
        setDisplayRepCount(currentReps);

        if (is67Reps && currentReps >= 67) {
          gameEndedRef.current = true;
          endGame(Math.round(elapsed));
          return;
          }
      }

      if (is67Reps) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      } else {
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
  const [trackingState, setTrackingState] = useState<{ bothHandsDetected: boolean; backendWarning?: string; initState?: string } | null>(null);

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

  // Handle calibration in a separate effect
  useEffect(() => {
    if (pageState !== 'calibrating' || !calibrationTrackerRef.current || !trackingState) return;

    const calibrated = calibrationTrackerRef.current.processFrame(trackingState.bothHandsDetected);
    if (calibrated) {
      startCountdown();
    }
  }, [pageState, trackingState, startCountdown]);

  // Update container size on resize - make it fill available space
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const parent = containerRef.current.parentElement;
        if (parent) {
          const width = parent.clientWidth - 32; // Account for padding
          const height = parent.clientHeight - 120; // More room for vertical space
          // Use the smaller dimension to keep square
          // Max 400px on mobile (<640px), 550px on larger screens
          const isMobile = window.innerWidth < 640;
          const maxSize = isMobile ? 400 : 550;
          const size = Math.min(width, height, maxSize);
          setContainerSize(Math.max(size, 300)); // minimum 300px (increased from 240px)
        }
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    // Small delay to ensure parent is sized
    const timeout = setTimeout(updateSize, 100);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeout);
    };
  }, [pageState]); // Re-run when page state changes

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

  const formatDuration = (ms: number) => {
    if (is67RepsMode(ms)) return '67 Reps';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Render based on state
  if (pageState === 'loading') {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
        <Header />
        <div className="min-h-screen flex items-center justify-center pb-12">
          <div className="text-white/50 text-sm">Loading...</div>
        </div>
      </main>
    );
  }

  if (pageState === 'error') {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
        <Header />
        <div className="min-h-screen flex items-center justify-center p-4 pb-12">
          <div className="glass-panel p-6 rounded-xl max-w-sm w-full text-center">
            <h2 className="text-lg font-bold text-white mb-2">Error</h2>
            <p className="text-white/60 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
              className="btn-primary w-full"
          >
            Back to Home
          </button>
          </div>
        </div>
      </main>
    );
  }

  if (pageState === 'join') {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
        <Header />
        <div className="min-h-screen flex items-center justify-center p-4 pt-16 pb-12">
          <div className="glass-panel p-5 rounded-xl max-w-sm w-full">
            <h1 className="text-xl font-bold text-white mb-1 text-center">Duel Challenge</h1>
            <p className="text-white/50 text-sm text-center mb-5">
              {players[0]?.username} challenged you
          </p>

            <div className="mb-4 p-3 bg-white/5 rounded-lg text-center border border-white/10">
              <p className="text-white/40 text-xs mb-1">Mode</p>
              <p className="text-lg font-bold text-white">
                {duel?.duration_ms ? formatDuration(duel.duration_ms) : '...'}
            </p>
          </div>

            <div className="mb-4">
              <label className="text-white/50 text-xs mb-1.5 block">Your name</label>
            <input
              type="text"
              value={joinUsername}
              onChange={(e) => setJoinUsername(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
                className="w-full rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30"
            />
          </div>

            {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}

          <button
            onClick={handleJoin}
            disabled={isJoining || !joinUsername.trim()}
              className={`btn-primary w-full ${
                (isJoining || !joinUsername.trim()) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isJoining ? 'Joining...' : 'Accept Duel'}
          </button>
          </div>
        </div>
      </main>
    );
  }

  if (pageState === 'lobby') {
    const myPlayer = players.find(p => p.player_key === myPlayerKey);
    const opponent = players.find(p => p.player_key !== myPlayerKey);

    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
        <Header />
        <div className="min-h-screen flex items-center justify-center p-4 pt-16 pb-12">
          <div className="glass-panel p-5 rounded-xl max-w-sm w-full">
            <h1 className="text-xl font-bold text-white mb-5 text-center">Duel Lobby</h1>

            <div className="space-y-2 mb-5">
            {myPlayer && (
                <div className={`p-3 rounded-lg ${myPlayer.ready ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-white/5 border border-white/10'}`}>
                <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{myPlayer.username} (You)</span>
                    <span className={`text-xs ${myPlayer.ready ? 'text-accent-green' : 'text-white/40'}`}>
                      {myPlayer.ready ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              </div>
            )}

            {opponent ? (
                <div className={`p-3 rounded-lg ${opponent.ready ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-white/5 border border-white/10'}`}>
                <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{opponent.username}</span>
                    <span className={`text-xs ${opponent.ready ? 'text-accent-green' : 'text-white/40'}`}>
                      {opponent.ready ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              </div>
            ) : (
                <div className="p-3 rounded-lg bg-white/5 border-2 border-dashed border-white/20">
                  <p className="text-white/40 text-sm text-center">Waiting for opponent...</p>
              </div>
            )}
          </div>

          {!opponent && (
              <div className="mb-5">
                <p className="text-white/50 text-xs mb-1.5">Share this link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/60 text-xs"
                />
                <button
                  onClick={copyLink}
                    className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all flex items-center gap-1.5 text-sm"
                >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleReady}
            disabled={!opponent}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
              !opponent
                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                : myPlayer?.ready
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-accent-green text-black hover:bg-accent-green-dark'
            }`}
          >
              {myPlayer?.ready ? 'Cancel Ready' : 'Ready'}
          </button>

          {opponent && players.every(p => p.ready) && (
              <p className="text-accent-green text-xs text-center mt-3 animate-pulse">
              Starting game...
            </p>
          )}
          </div>
        </div>
      </main>
    );
  }

  // Game states (calibrating, countdown, playing, results)
  
  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
      <Header />
      <div className="min-h-screen flex items-center justify-center p-4 pt-16 pb-12">
        <div 
          ref={containerRef}
          className="relative rounded-xl overflow-hidden bg-black/30 backdrop-blur-sm border border-white/10 shadow-xl"
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
            backendWarning={trackingState?.backendWarning}
            initState={trackingState?.initState as 'idle' | 'loading' | 'warming_up' | 'ready' | 'error' | undefined}
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
            const formatTime = (ms: number) => (ms / 1000).toFixed(2);
            const myPlayer = players.find(p => p.player_key === myPlayerKey);
            const opponent = players.find(p => p.player_key !== myPlayerKey);
            
            const handleShareResult = async () => {
              const myName = myPlayer?.username || 'Player 1';
              const oppName = opponent?.username || 'Player 2';
              const myScoreText = is67Reps ? `${formatTime(finalScore)}s` : `${finalScore} reps`;
              const oppScoreText = result?.opponentScore != null 
                ? (is67Reps ? `${formatTime(result.opponentScore)}s` : `${result.opponentScore} reps`)
                : 'pending';
              
              const outcomeText = result?.outcome === 'win' ? 'beat' 
                : result?.outcome === 'lose' ? 'lost to' 
                : 'tied with';
              
              const duelUrl = `${window.location.origin}/duel/${duelId}/results`;
              const shareText = `${myName} ${outcomeText} ${oppName} on 67ranked.com\n${myScoreText} vs ${oppScoreText}`;
              
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: '67Ranked Duel',
                    text: shareText,
                    url: duelUrl
                  });
                } catch {
                  // User cancelled
                }
              } else {
                await navigator.clipboard.writeText(`${shareText}\n${duelUrl}`);
                alert('Copied!');
              }
            };

            const handleDownload = () => {
              if (!duel || !myPlayer || !opponent) return;
              
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) return;

              const scale = 2;
              const width = 600;
              const hasStats = result?.myRankStats || result?.opponentRankStats;
              const height = hasStats ? 480 : 420;
              canvas.width = width * scale;
              canvas.height = height * scale;
              ctx.scale(scale, scale);

              // Background
              ctx.fillStyle = '#0a0a0a';
              ctx.fillRect(0, 0, width, height);

              // Subtle green radial glow
              const gradient = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, 300);
              gradient.addColorStop(0, 'rgba(74, 222, 128, 0.08)');
              gradient.addColorStop(1, 'transparent');
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, width, height);

              // Card dimensions
              const cardX = 32;
              const cardY = 20;
              const cardW = width - 64;
              const cardH = hasStats ? 440 : 380;
              const radius = 16;

              // Card background
              ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
              ctx.beginPath();
              ctx.roundRect(cardX, cardY, cardW, cardH, radius);
              ctx.fill();

              // Card border
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
              ctx.lineWidth = 1;
              ctx.stroke();

              // Header
              const headerH = 48;
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
              ctx.beginPath();
              ctx.moveTo(cardX, cardY + headerH);
              ctx.lineTo(cardX + cardW, cardY + headerH);
              ctx.stroke();

              // Mode icon
              const iconX = cardX + 20;
              const iconY = cardY + 14;
              const iconSize = 24;
              ctx.strokeStyle = '#4ade80';
              ctx.lineWidth = 2;
              
              if (duel.duration_ms === DURATION_67_REPS) {
                const cx = iconX + iconSize / 2;
                const cy = iconY + iconSize / 2;
                ctx.beginPath();
                ctx.arc(cx, cy, 10, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx, cy, 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#4ade80';
                ctx.beginPath();
                ctx.arc(cx, cy, 2, 0, Math.PI * 2);
                ctx.fill();
              } else if (duel.duration_ms === DURATION_6_7S) {
                ctx.fillStyle = '#4ade80';
                ctx.beginPath();
                ctx.moveTo(iconX + 14, iconY + 2);
                ctx.lineTo(iconX + 6, iconY + 12);
                ctx.lineTo(iconX + 11, iconY + 12);
                ctx.lineTo(iconX + 10, iconY + 22);
                ctx.lineTo(iconX + 18, iconY + 10);
                ctx.lineTo(iconX + 13, iconY + 10);
                ctx.lineTo(iconX + 14, iconY + 2);
                ctx.fill();
              } else {
                const cx = iconX + iconSize / 2;
                const cy = iconY + iconSize / 2 + 2;
                ctx.beginPath();
                ctx.arc(cx, cy, 9, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx, cy - 5);
                ctx.lineTo(cx + 3, cy - 2);
                ctx.stroke();
              }

              // Mode label
              const formatDurationLabel = (ms: number) => {
                if (ms === DURATION_6_7S) return '6.7s Sprint';
                if (ms === DURATION_20S) return '20s Endurance';
                if (ms === DURATION_67_REPS) return '67 Reps';
                return (ms / 1000).toFixed(1) + 's';
              };
              ctx.fillStyle = '#4ade80';
              ctx.font = '500 16px system-ui, -apple-system, sans-serif';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(formatDurationLabel(duel.duration_ms), iconX + iconSize + 10, cardY + headerH / 2);

              // Player cards
              const vsGap = 36;
              const playerCardW = 210;
              const playerCardH = 170;
              const totalPlayerWidth = playerCardW * 2 + vsGap;
              const playerStartX = (width - totalPlayerWidth) / 2;
              const playerCardY = cardY + headerH + 24;

              const myOutcome = result?.outcome;
              const isWinner = myOutcome === 'win';
              const isLoser = myOutcome === 'lose';

              // Draw player card function
              const drawPlayerCard = (x: number, username: string, score: number, isPlayerWinner: boolean, isPlayerLoser: boolean) => {
                // Card bg
                if (isPlayerWinner) {
                  ctx.fillStyle = 'rgba(74, 222, 128, 0.05)';
                  ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)';
                } else if (isPlayerLoser) {
                  ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
                  ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
                } else {
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                }
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(x, playerCardY, playerCardW, playerCardH, 12);
                ctx.fill();
                ctx.stroke();

                const centerX = x + playerCardW / 2;
                const hasLabel = isPlayerWinner || isPlayerLoser;

                // Winner/Loser badge
                if (isPlayerWinner) {
                  ctx.fillStyle = '#4ade80';
                  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText('WINNER', centerX, playerCardY + 24);
                } else if (isPlayerLoser) {
                  ctx.fillStyle = '#f87171';
                  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText('LOSER', centerX, playerCardY + 24);
                }

                // Username
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.font = '14px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(username, centerX, playerCardY + (hasLabel ? 48 : 40));

                // Score
                const scoreStr = is67Reps ? formatTime(score) : score.toString();
                ctx.save();
                ctx.fillStyle = isPlayerWinner ? '#4ade80' : isPlayerLoser ? '#f87171' : '#fff';
                ctx.font = '900 48px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.translate(centerX, playerCardY + (hasLabel ? 100 : 92));
                ctx.transform(1, 0, -0.12, 1, 0, 0);
                ctx.fillText(scoreStr, 0, 0);
                ctx.restore();

                // Unit
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.font = '12px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(is67Reps ? 'seconds' : 'reps', centerX, playerCardY + (hasLabel ? 130 : 122));
              };

              // Draw both player cards
              drawPlayerCard(playerStartX, myPlayer.username, finalScore, isWinner, isLoser);

              // VS
              ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
              ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('VS', width / 2, playerCardY + playerCardH / 2);

              // Opponent card
              if (result?.opponentScore != null) {
                drawPlayerCard(playerStartX + playerCardW + vsGap, opponent.username, result.opponentScore, isLoser, isWinner);
              }

              // Tie indicator
              if (myOutcome === 'tie') {
                ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
                ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
                ctx.beginPath();
                ctx.roundRect(playerStartX, playerCardY + playerCardH + 16, totalPlayerWidth, 36, 8);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#eab308';
                ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('DRAW', width / 2, playerCardY + playerCardH + 34);
              }

              // Rank Stats
              if (hasStats) {
                const statsY = playerCardY + playerCardH + 20;
                const statBoxW = 70;
                const statBoxH = 40;
                const statGap = 6;
                const statsGroupW = statBoxW * 3 + statGap * 2;
                
                // Draw stats for each player
                const drawPlayerStats = (startX: number, stats: { dailyRank: number; allTimeRank: number; percentile: number } | null | undefined) => {
                  if (!stats) return;
                  
                  const labels = ['Daily', 'All-Time', 'Top'];
                  const values = [`#${stats.dailyRank}`, `#${stats.allTimeRank}`, `${stats.percentile}%`];
                  
                  for (let i = 0; i < 3; i++) {
                    const boxX = startX + i * (statBoxW + statGap);
                    
                    // Box background
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(boxX, statsY, statBoxW, statBoxH, 6);
                    ctx.fill();
                    ctx.stroke();
                    
                    // Label
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.font = '9px system-ui, -apple-system, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(labels[i], boxX + statBoxW / 2, statsY + 12);
                    
                    // Value
                    ctx.fillStyle = i === 2 ? '#4ade80' : '#fff';
                    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
                    ctx.fillText(values[i], boxX + statBoxW / 2, statsY + 28);
                  }
                };
                
                // Player 1 (me) stats - left side
                const player1StatsX = playerStartX + (playerCardW - statsGroupW) / 2;
                drawPlayerStats(player1StatsX, result?.myRankStats);
                
                // Player 2 (opponent) stats - right side  
                const player2StatsX = playerStartX + playerCardW + vsGap + (playerCardW - statsGroupW) / 2;
                drawPlayerStats(player2StatsX, result?.opponentRankStats);
              }

              // CTA Button
              const ctaY = cardY + cardH - 60;
              const ctaH = 44;
              const ctaX = cardX + 20;
              const ctaW = cardW - 40;

              ctx.fillStyle = '#4ade80';
              ctx.beginPath();
              ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 10);
              ctx.fill();

              ctx.fillStyle = '#000';
              ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('Create Your Own Duel @ 67ranked.com', width / 2, ctaY + ctaH / 2);

              // Download
              const link = document.createElement('a');
              link.download = `67ranked-duel-${myPlayer.username}-vs-${opponent.username}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
            };
            
            const waitingForOpponent = result?.opponentScore == null;
            
            return (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm p-3">
                <div className="glass-panel p-5 rounded-xl text-center w-full max-w-xs">
                  {/* Result header */}
                  <div className={`text-2xl font-bold mb-4 ${
                    waitingForOpponent ? 'text-white/50' :
                result?.outcome === 'win' ? 'text-accent-green' :
                result?.outcome === 'lose' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                    {waitingForOpponent ? 'WAITING...' :
                     result?.outcome === 'win' ? 'YOU WIN' :
                     result?.outcome === 'lose' ? 'YOU LOSE' : 'TIE'}
              </div>

                  {/* Scores */}
                  <div className="flex justify-center items-center gap-4 mb-4">
                <div className="text-center">
                      <p className="text-white/50 text-xs mb-1">{myPlayer?.username || 'You'}</p>
                      <p className="text-2xl font-bold text-white" style={{ fontStyle: 'italic' }}>
                        {is67Reps ? formatTime(finalScore) : finalScore}
                      </p>
                      {is67Reps && <p className="text-white/30 text-[10px]">seconds</p>}
                </div>
                    <div className="text-white/30 text-sm">vs</div>
                <div className="text-center">
                      <p className="text-white/50 text-xs mb-1">{opponent?.username || 'Opponent'}</p>
                      <p className="text-2xl font-bold text-white" style={{ fontStyle: 'italic' }}>
                        {result?.opponentScore != null 
                          ? (is67Reps ? formatTime(result.opponentScore) : result.opponentScore)
                          : '...'}
                      </p>
                      {is67Reps && result?.opponentScore != null && <p className="text-white/30 text-[10px]">seconds</p>}
                </div>
              </div>

                  {/* Rank Stats (only show if available) */}
                  {result?.myRankStats && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                        <p className="text-white/40 text-[10px] mb-0.5">Daily</p>
                        <p className="text-white font-bold text-sm">#{result.myRankStats.dailyRank}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                        <p className="text-white/40 text-[10px] mb-0.5">All-Time</p>
                        <p className="text-white font-bold text-sm">#{result.myRankStats.allTimeRank}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                        <p className="text-white/40 text-[10px] mb-0.5">Top</p>
                        <p className="text-accent-green font-bold text-sm">{result.myRankStats.percentile}%</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    {waitingForOpponent ? (
                      <div className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/40 font-medium text-sm flex items-center justify-center gap-2">
                        <ShareIcon />
                        <span>Wait for opponent to share</span>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleShareResult}
                          className="w-full py-2.5 rounded-lg bg-accent-green text-black font-semibold text-sm hover:bg-accent-green-dark transition-all flex items-center justify-center gap-2"
                        >
                          <ShareIcon />
                          Share
                        </button>
                        <button
                          onClick={handleDownload}
                          className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <DownloadIcon />
                          Download Image
                        </button>
                      </>
                    )}
                <button
                  onClick={() => router.push('/duel')}
                      className="w-full py-2.5 rounded-lg bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                >
                      <RefreshIcon />
                      New Duel
                </button>
                <button
                  onClick={() => router.push('/')}
                      className="w-full py-2.5 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                      <HomeIcon />
                      Home
                </button>
              </div>
            </div>
          </div>
            );
          })()}
        </div>
      </div>
    </main>
  );
}
