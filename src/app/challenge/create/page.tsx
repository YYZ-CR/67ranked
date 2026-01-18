'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DURATION_6_7S, DURATION_20S, MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION } from '@/types/game';
import { HandTracker, RepCounter, CalibrationTracker, TrackingState } from '@/lib/hand-tracking';
import { CalibrationOverlay } from '@/components/game/CalibrationOverlay';
import { CountdownOverlay } from '@/components/game/CountdownOverlay';
import { GameOverlay } from '@/components/game/GameOverlay';

type PageState = 'setup' | 'calibrating' | 'countdown' | 'playing' | 'submitting' | 'done';

export default function CreateChallengePage() {
  const router = useRouter();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const repCounterRef = useRef<RepCounter | null>(null);
  const calibrationTrackerRef = useRef<CalibrationTracker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const repCountRef = useRef<number>(0);
  const sessionTokenRef = useRef<string | null>(null);
  const challengeIdRef = useRef<string | null>(null);
  const usernameRef = useRef<string>('');
  const durationRef = useRef<number>(DURATION_6_7S);
  
  // State
  const [pageState, setPageState] = useState<PageState>('setup');
  const [username, setUsername] = useState('');
  const [duration, setDuration] = useState<number>(DURATION_6_7S);
  const [customSeconds, setCustomSeconds] = useState('10.0');
  const [showCustom, setShowCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingState, setTrackingState] = useState<TrackingState | null>(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Keep refs in sync
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const handleDurationSelect = (ms: number) => {
    setDuration(ms);
    setShowCustom(false);
  };

  const handleCustomToggle = () => {
    setShowCustom(true);
    const seconds = parseFloat(customSeconds) || 10;
    setDuration(Math.round(seconds * 1000));
  };

  const handleCustomChange = (value: string) => {
    setCustomSeconds(value);
    const seconds = parseFloat(value) || 0;
    const ms = Math.round(seconds * 1000);
    if (ms >= MIN_CUSTOM_DURATION && ms <= MAX_CUSTOM_DURATION) {
      setDuration(ms);
    }
  };

  // End game callback
  const endGame = useCallback(async () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const score = repCounterRef.current?.getRepCount() || 0;
    setFinalScore(score);
    setPageState('submitting');

    if (sessionTokenRef.current) {
      try {
        await fetch('/api/challenge/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: sessionTokenRef.current,
            score,
            username: usernameRef.current.trim()
          })
        });
      } catch (err) {
        console.error('Submit error:', err);
      }
    }

    setPageState('done');
  }, []);

  // Start gameplay
  const startGameplay = useCallback(() => {
    repCounterRef.current?.reset();
    repCountRef.current = 0;
    const durationMs = durationRef.current;
    setTimeRemaining(durationMs);
    setPageState('playing');

    const startTime = performance.now();

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

  // Handle calibration progress
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
      setPageState('setup');
    }
  };

  // Create challenge and start calibration
  const handleStart = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }

    setError(null);

    try {
      const response = await fetch('/api/challenge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          duration_ms: duration
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create challenge');
      }

      const data = await response.json();
      challengeIdRef.current = data.challengeId;
      setShareUrl(data.shareUrl);

      const sessionResponse = await fetch('/api/challenge/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: data.challengeId,
          player_key: data.player_key
        })
      });

      if (!sessionResponse.ok) throw new Error('Failed to get session');
      const sessionData = await sessionResponse.json();
      sessionTokenRef.current = sessionData.token;

      setPageState('calibrating');
      await initializeCamera();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge');
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

  if (pageState === 'setup') {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
        <div className="glass-panel p-6 rounded-2xl max-w-md w-full">
          <button
            onClick={() => router.push('/')}
            className="text-white/50 hover:text-white mb-4 text-sm"
          >
            ← Back to Home
          </button>

          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            🎯 Create a Challenge
          </h1>

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

          <div className="mb-6">
            <label className="text-white/70 text-sm mb-2 block">Duration</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleDurationSelect(DURATION_6_7S)}
                className={`py-3 rounded-xl font-semibold transition-all ${
                  duration === DURATION_6_7S && !showCustom
                    ? 'bg-accent-green text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                6.7s
              </button>
              <button
                onClick={() => handleDurationSelect(DURATION_20S)}
                className={`py-3 rounded-xl font-semibold transition-all ${
                  duration === DURATION_20S && !showCustom
                    ? 'bg-accent-green text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                20s
              </button>
              <button
                onClick={handleCustomToggle}
                className={`py-3 rounded-xl font-semibold transition-all ${
                  showCustom
                    ? 'bg-accent-green text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Custom
              </button>
            </div>

            {showCustom && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  value={customSeconds}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  min={5}
                  max={120}
                  step="0.1"
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-center font-mono focus:outline-none focus:border-accent-green"
                />
                <span className="text-white/70">seconds</span>
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center mb-4">{error}</p>
          )}

          <button
            onClick={handleStart}
            disabled={!username.trim()}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              !username.trim()
                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                : 'bg-accent-green text-black hover:bg-accent-green/90'
            }`}
          >
            Start Challenge
          </button>

          <p className="text-white/40 text-xs text-center mt-4">
            Play first, then share the link with your opponent
          </p>
        </div>
      </main>
    );
  }

  if (pageState === 'done') {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
        <div className="glass-panel p-6 rounded-2xl max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-white mb-2">Challenge Created!</h2>
          <p className="text-white/70 mb-4">Your score: <span className="text-accent-green font-bold text-3xl">{finalScore}</span> reps</p>

          <div className="mb-6">
            <p className="text-white/70 text-sm mb-2">Share this link with your opponent:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white/70 text-sm"
              />
              <button
                onClick={copyLink}
                className="px-4 py-2 rounded-xl bg-accent-green text-black font-semibold hover:bg-accent-green/90"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => challengeIdRef.current && router.push(`/challenge/${challengeIdRef.current}`)}
              className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20"
            >
              View Challenge
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 rounded-xl bg-white/5 text-white/70 font-semibold hover:bg-white/10"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Game states
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

        {pageState === 'submitting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-white text-xl">Submitting score...</div>
          </div>
        )}
      </div>
    </main>
  );
}
