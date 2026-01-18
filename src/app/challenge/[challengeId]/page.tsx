'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HandTracker, RepCounter, CalibrationTracker, TrackingState } from '@/lib/hand-tracking';
import { CalibrationOverlay } from '@/components/game/CalibrationOverlay';
import { CountdownOverlay } from '@/components/game/CountdownOverlay';
import { GameOverlay } from '@/components/game/GameOverlay';

interface ChallengeData {
  id: string;
  duration_ms: number;
  status: string;
}

interface ChallengeEntry {
  player_key: string;
  username: string;
  score: number;
}

type PageState = 'loading' | 'view' | 'join' | 'calibrating' | 'countdown' | 'playing' | 'results' | 'error';

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.challengeId as string;

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const repCounterRef = useRef<RepCounter | null>(null);
  const calibrationTrackerRef = useRef<CalibrationTracker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const repCountRef = useRef<number>(0);
  const sessionTokenRef = useRef<string | null>(null);
  const playerKeyRef = useRef<string | null>(null);
  const usernameRef = useRef<string>('');

  // State
  const [pageState, setPageState] = useState<PageState>('loading');
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [trackingState, setTrackingState] = useState<TrackingState | null>(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [result, setResult] = useState<{ myScore: number; opponentScore: number; outcome: string } | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Keep username ref in sync
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  // Load challenge data
  useEffect(() => {
    const loadChallenge = async () => {
      try {
        const response = await fetch(`/api/challenge/${challengeId}`);
        if (!response.ok) throw new Error('Challenge not found');
        
        const data = await response.json();
        setChallenge(data.challenge);
        setEntries(data.entries || []);
        setShareUrl(window.location.href);

        if (data.challenge.status === 'expired') {
          setError('This challenge has expired');
          setPageState('error');
        } else if (data.entries.length >= 2) {
          setPageState('results');
        } else if (data.entries.length === 1) {
          setPageState('join');
        } else {
          setPageState('view');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load challenge');
        setPageState('error');
      }
    };

    loadChallenge();
  }, [challengeId]);

  // End game callback
  const endGame = useCallback(async () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Use the tracker's internal rep count
    const score = trackerRef.current?.getRepCount() || repCountRef.current || 0;
    setFinalScore(score);

    if (sessionTokenRef.current) {
      try {
        const response = await fetch('/api/challenge/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: sessionTokenRef.current,
            score,
            username: usernameRef.current.trim()
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
    if (!challenge) return;

    // Reset using the tracker's internal rep counter
    trackerRef.current?.resetRepCounter();
    repCountRef.current = 0;
    setTimeRemaining(challenge.duration_ms);
    setPageState('playing');

    const startTime = performance.now();
    const durationMs = challenge.duration_ms;

    const gameLoop = () => {
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, durationMs - elapsed);
      setTimeRemaining(remaining);

      // Use the tracker's built-in pose-based rep counting
      if (trackerRef.current) {
        trackerRef.current.processGameplay(null, null);
        repCountRef.current = trackerRef.current.getRepCount();
      }

      if (remaining > 0) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      } else {
        endGame();
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [challenge, endGame]);

  // Start countdown
  const startCountdown = useCallback(() => {
    setPageState('countdown');
    setCountdownValue(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownValue(count);
      } else {
        clearInterval(interval);
        setCountdownValue(0);
        setTimeout(() => startGameplay(), 500);
      }
    }, 1000);
  }, [startGameplay]);

  // Handle calibration
  useEffect(() => {
    if (pageState !== 'calibrating' || !calibrationTrackerRef.current || !trackingState) return;

    const checkCalibration = () => {
      if (calibrationTrackerRef.current) {
        const calibrated = calibrationTrackerRef.current.processFrame(trackingState.bothHandsDetected);
        if (calibrated) {
          startCountdown();
        }
      }

      if (pageState === 'calibrating') {
        animationFrameRef.current = requestAnimationFrame(checkCalibration);
      }
    };

    animationFrameRef.current = requestAnimationFrame(checkCalibration);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pageState, trackingState, startCountdown]);

  // Initialize camera
  const initializeCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const tracker = new HandTracker();
      trackerRef.current = tracker;
      repCounterRef.current = new RepCounter();
      calibrationTrackerRef.current = new CalibrationTracker();

      await tracker.initialize(
        videoRef.current,
        canvasRef.current,
        (state) => setTrackingState(state)
      );

      tracker.start();
    } catch {
      setError('Failed to access camera');
      setPageState('join');
    }
  };

  // Start playing
  const handlePlay = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }

    setError(null);
    playerKeyRef.current = crypto.randomUUID();

    try {
      const response = await fetch('/api/challenge/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          player_key: playerKeyRef.current
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start');
      }

      const data = await response.json();
      sessionTokenRef.current = data.token;

      setPageState('calibrating');
      await initializeCamera();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
    }
  };

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

  if (pageState === 'view' || pageState === 'join') {
    const challenger = entries[0];

    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
        <div className="glass-panel p-6 rounded-2xl max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">🎯 Challenge</h1>

          {challenger ? (
            <div className="mb-6 text-center">
              <p className="text-white/60 mb-2">
                <span className="text-white font-semibold">{challenger.username}</span> scored:
              </p>
              <p className="text-5xl font-black text-accent-green">{challenger.score}</p>
              <p className="text-white/50 text-sm">
                in {challenge?.duration_ms ? `${(challenge.duration_ms / 1000).toFixed(1)}s` : '...'}
              </p>
            </div>
          ) : (
            <div className="mb-6 text-center">
              <p className="text-white/60">No scores yet</p>
            </div>
          )}

          <div className="mb-6">
            <label className="text-white/70 text-sm mb-2 block">Your Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-green"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

          <button
            onClick={handlePlay}
            disabled={!username.trim()}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              !username.trim()
                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                : 'bg-accent-green text-black hover:bg-accent-green/90'
            }`}
          >
            {challenger ? 'Accept Challenge' : 'Play First'}
          </button>

          {!challenger && (
            <div className="mt-4">
              <p className="text-white/50 text-sm text-center mb-2">Or share this link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white/70 text-sm"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
                >
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (pageState === 'results') {
    const myEntry = entries.find(e => e.player_key === playerKeyRef.current) || { score: finalScore, username };
    const opponentEntry = entries.find(e => e.player_key !== playerKeyRef.current);

    let outcome: 'win' | 'lose' | 'tie' | null = null;
    if (result) {
      outcome = result.outcome as 'win' | 'lose' | 'tie';
    } else if (opponentEntry && myEntry) {
      if (myEntry.score > opponentEntry.score) outcome = 'win';
      else if (myEntry.score < opponentEntry.score) outcome = 'lose';
      else outcome = 'tie';
    }

    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
        <div className="glass-panel p-6 rounded-2xl max-w-md w-full text-center">
          {opponentEntry && outcome ? (
            <>
              <div className={`text-4xl font-black mb-4 ${
                outcome === 'win' ? 'text-accent-green' :
                outcome === 'lose' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {outcome === 'win' ? '🎉 YOU WIN!' :
                 outcome === 'lose' ? '😔 YOU LOSE' : '🤝 TIE!'}
              </div>

              <div className="flex justify-center gap-8 mb-6">
                <div className="text-center">
                  <p className="text-white/60 text-sm">{myEntry.username || 'You'}</p>
                  <p className="text-3xl font-bold text-white">{finalScore || myEntry.score}</p>
                </div>
                <div className="text-white/40 text-2xl self-center">vs</div>
                <div className="text-center">
                  <p className="text-white/60 text-sm">{opponentEntry.username}</p>
                  <p className="text-3xl font-bold text-white">{opponentEntry.score}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">⏳</div>
              <h2 className="text-xl font-bold text-white mb-2">Waiting for opponent</h2>
              <p className="text-white/70 mb-4">
                Your score: <span className="text-accent-green font-bold text-2xl">{finalScore}</span>
              </p>

              <div className="mb-6">
                <p className="text-white/50 text-sm mb-2">Share this link:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white/70 text-sm"
                  />
                  <button
                    onClick={copyLink}
                    className="px-4 py-2 rounded-xl bg-accent-green text-black font-semibold"
                  >
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push('/challenge/create')}
              className="px-6 py-3 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-600"
            >
              🎯 New Challenge
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Game states
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
            bothHandsDetected={trackingState?.bothHandsDetected || false}
          />
        )}

        {pageState === 'countdown' && (
          <CountdownOverlay value={countdownValue} />
        )}

        {pageState === 'playing' && (
          <GameOverlay
            repCount={repCountRef.current}
            timeRemaining={timeRemaining}
            trackingLost={!trackingState?.bothHandsDetected}
          />
        )}
      </div>
    </main>
  );
}
