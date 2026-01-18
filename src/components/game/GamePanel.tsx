'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { GameState, GameMode, DURATION_6_7S, DURATION_67_REPS, is67RepsMode } from '@/types/game';
import { HandTracker, TrackingState, CalibrationTracker } from '@/lib/hand-tracking';
import { StartScreen } from './StartScreen';
import { CalibrationOverlay } from './CalibrationOverlay';
import { ModeSelector } from './ModeSelector';
import { CountdownOverlay } from './CountdownOverlay';
import { GameOverlay } from './GameOverlay';
import { EndScreen } from './EndScreen';

interface GamePanelProps {
  onScoreSubmitted?: () => void;
}

export function GamePanel({ onScoreSubmitted }: GamePanelProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const calibrationTrackerRef = useRef<CalibrationTracker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartTimeRef = useRef<number>(0);
  const repCountRef = useRef<number>(0);
  const sessionTokenRef = useRef<string | null>(null);
  const gameEndedRef = useRef<boolean>(false);
  const finishTimeRef = useRef<number>(0);
  const gameModeRef = useRef<{ is67Reps: boolean; duration: number }>({ is67Reps: false, duration: 0 });
  const selectedDurationRef = useRef<number>(DURATION_6_7S); // Store selected duration immediately
  
  // State
  const [gameState, setGameState] = useState<GameState>('idle');
  const [gameMode, setGameMode] = useState<GameMode>('normal');
  const [duration, setDuration] = useState<number>(DURATION_6_7S);
  const [trackingState, setTrackingState] = useState<TrackingState | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdownValue, setCountdownValue] = useState<number>(3);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [scoreId, setScoreId] = useState<string | null>(null);
  const [displayRepCount, setDisplayRepCount] = useState<number>(0);
  
  // Container size for responsive canvas
  const [containerSize, setContainerSize] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setContainerSize(Math.min(width, 500));
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize camera and MediaPipe
  const initializeCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      setCameraError(null);
      
      const tracker = new HandTracker();
      trackerRef.current = tracker;
      calibrationTrackerRef.current = new CalibrationTracker();
      
      await tracker.initialize(
        videoRef.current,
        canvasRef.current,
        (state) => setTrackingState(state)
      );
      
      tracker.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize camera';
      
      if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
        setCameraError('Camera permission denied. Please allow camera access and reload the page.');
      } else if (message.includes('NotFoundError')) {
        setCameraError('No camera found. Please connect a camera and reload.');
      } else {
        setCameraError(message);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trackerRef.current) {
        trackerRef.current.cleanup();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Handle start button
  const handleStart = async () => {
    await initializeCamera();
    setGameState('calibrating');
  };

  // Handle calibration
  useEffect(() => {
    if (gameState !== 'calibrating' || !calibrationTrackerRef.current) return;
    
    const checkCalibration = () => {
      if (calibrationTrackerRef.current && trackingState) {
        const calibrated = calibrationTrackerRef.current.processFrame(trackingState.bothHandsDetected);
        if (calibrated) {
          setGameState('selecting');
        }
      }
      
      if (gameState === 'calibrating') {
        animationFrameRef.current = requestAnimationFrame(checkCalibration);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(checkCalibration);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, trackingState]);

  // Handle mode selection
  const handleModeSelect = async (mode: GameMode, selectedDuration: number) => {
    setGameMode(mode);
    setDuration(selectedDuration);
    selectedDurationRef.current = selectedDuration; // Store immediately in ref
    
    // Duel mode redirects to its own page
    if (mode === 'duel') {
      window.location.href = '/duel/create';
      return;
    }
    
    // Get session token for normal mode
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_ms: selectedDuration })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      
      const data = await response.json();
      sessionTokenRef.current = data.token;
      
      // Start countdown
      startCountdown();
    } catch (err) {
      console.error('Session error:', err);
      setCameraError('Failed to start game. Please try again.');
      setGameState('idle');
    }
  };

  // Countdown sequence
  const startCountdown = () => {
    setGameState('countdown');
    setCountdownValue(3);
    
    let count = 3;
    const countdownTick = () => {
      if (count > 0) {
        setCountdownValue(count);
        count--;
        timerRef.current = setTimeout(countdownTick, 1000);
      } else {
        setCountdownValue(0);
        timerRef.current = setTimeout(() => {
          startGameplay();
        }, 500);
      }
    };
    
    countdownTick();
  };

  // Start gameplay
  const startGameplay = () => {
    // Reset the tracker's internal rep counter
    trackerRef.current?.resetRepCounter();
    repCountRef.current = 0;
    setDisplayRepCount(0);
    gameEndedRef.current = false;
    finishTimeRef.current = 0;
    
    // Use ref value, but fall back to state if ref wasn't set (defensive)
    // Also verify the ref was actually updated (not still the initial value when 67 reps is selected)
    let actualDuration = selectedDurationRef.current;
    
    // If state says 67 reps but ref doesn't match, trust the state
    if (is67RepsMode(duration) && !is67RepsMode(actualDuration)) {
      actualDuration = duration;
      selectedDurationRef.current = duration; // Fix the ref
    }
    
    const is67Reps = is67RepsMode(actualDuration);
    const gameDuration = is67Reps ? 0 : actualDuration;
    
    // Store in ref to avoid stale closure issues
    gameModeRef.current = { is67Reps, duration: actualDuration };
    
    console.log('[67ranked] Starting game:', { actualDuration, is67Reps, gameDuration });
    
    setTimeRemaining(gameDuration);
    setElapsedTime(0);
    gameStartTimeRef.current = performance.now();
    setGameState('playing');
    
    // Start game loop
    const gameLoop = () => {
      // If game already ended, don't process anything more
      if (gameEndedRef.current) {
        return;
      }
      
      const elapsed = performance.now() - gameStartTimeRef.current;
      const { is67Reps: currentIs67Reps, duration: currentDuration } = gameModeRef.current;
      
      // Update time display based on mode
      if (currentIs67Reps) {
        // 67 reps mode: show elapsed time (counting up)
        setElapsedTime(elapsed);
      } else {
        // Timed mode: show remaining time (counting down)
        const remaining = Math.max(0, currentDuration - elapsed);
        setTimeRemaining(remaining);
      }
      
      // Process reps
      if (trackerRef.current) {
        trackerRef.current.processGameplay(null, null);
        const currentReps = trackerRef.current.getRepCount();
        repCountRef.current = currentReps;
        setDisplayRepCount(currentReps);
      }
      
      // Check end conditions based on mode
      if (currentIs67Reps) {
        // 67 reps mode: end when we hit 67 reps
        if (repCountRef.current >= 67) {
          finishTimeRef.current = elapsed;
          gameEndedRef.current = true;
          endGame(elapsed, true);
          return;
        }
      } else {
        // Timed mode: end ONLY when time runs out (not based on reps)
        const remaining = currentDuration - elapsed;
        if (remaining <= 0) {
          gameEndedRef.current = true;
          endGame(undefined, false);
          return;
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // End game - pass is67Reps explicitly to avoid state timing issues
  const endGame = (finalElapsedMs?: number, is67Reps?: boolean) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Use the passed flag or fall back to ref (never rely on state here)
    const wasSpeedrunMode = is67Reps ?? gameModeRef.current.is67Reps;
    
    if (wasSpeedrunMode) {
      // 67 reps mode: score is the elapsed time in ms
      const elapsed = finalElapsedMs ?? finishTimeRef.current ?? (performance.now() - gameStartTimeRef.current);
      const roundedElapsed = Math.round(elapsed);
      setFinalScore(roundedElapsed);
      setElapsedTime(roundedElapsed);
      setDisplayRepCount(67); // Ensure display shows 67
    } else {
      // Timed mode: score is the rep count
      const score = repCountRef.current; // Use ref, not tracker (might be cleaned up)
      setFinalScore(score);
    }
    
    setGameState('ended');
    setIsSubmitted(false);
    setSubmitError(null);
    
    // Play end sound
    playEndSound();
  };

  // Play "six seven" sound
  const playEndSound = () => {
    // Using Web Audio API for a simple beep sequence
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      playTone(523, now, 0.15); // C5 - "six"
      playTone(587, now + 0.2, 0.15); // D5 - "se"
      playTone(659, now + 0.4, 0.25); // E5 - "ven"
    } catch {
      // Audio not supported, fail silently
    }
  };

  // Submit score
  const handleSubmit = async (username: string) => {
    if (!sessionTokenRef.current) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: sessionTokenRef.current,
          username,
          score: finalScore
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit score');
      }
      
      const data = await response.json();
      setScoreId(data.scoreId);
      setIsSubmitted(true);
      onScoreSubmitted?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit score');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Play again
  const handlePlayAgain = () => {
    sessionTokenRef.current = null;
    setScoreId(null);
    setGameState('selecting');
    calibrationTrackerRef.current?.reset();
  };

  // Cancel mode selection
  const handleCancelSelect = () => {
    setGameState('calibrating');
    calibrationTrackerRef.current?.reset();
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex-shrink-0 flex items-center justify-center"
      style={{ 
        width: '100%',
        maxWidth: '500px'
      }}
    >
      {/* Camera container */}
      <div 
        className="relative overflow-hidden rounded-2xl bg-gray-900 ring-2 ring-accent-green/30 shadow-[0_0_30px_rgba(74,222,128,0.15)]"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Hidden video for MediaPipe */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover opacity-0"
          style={{ transform: 'scaleX(-1)' }}
        />
        
        {/* Render canvas */}
        <canvas
          ref={canvasRef}
          width={containerSize}
          height={containerSize}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* State-based overlays */}
        {gameState === 'idle' && (
          <StartScreen 
            onStart={handleStart} 
            error={cameraError}
            onRetry={handleStart}
          />
        )}

        {gameState === 'calibrating' && calibrationTrackerRef.current && (
          <CalibrationOverlay
            progress={calibrationTrackerRef.current.getProgress()}
            bothHandsDetected={trackingState?.bothHandsDetected || false}
          />
        )}

        {gameState === 'selecting' && (
          <ModeSelector
            onSelect={handleModeSelect}
            onCancel={handleCancelSelect}
          />
        )}

        {gameState === 'countdown' && (
          <CountdownOverlay value={countdownValue} />
        )}

        {gameState === 'playing' && (
          <GameOverlay
            repCount={displayRepCount}
            timeRemaining={timeRemaining}
            elapsedTime={elapsedTime}
            is67RepsMode={is67RepsMode(duration)}
            trackingLost={!trackingState?.bothHandsDetected}
          />
        )}

        {gameState === 'ended' && (
          <EndScreen
            result={{
              myScore: is67RepsMode(duration) ? 67 : finalScore,
              myUsername: ''
            }}
            duration={duration}
            elapsedTime={is67RepsMode(duration) ? finalScore : undefined}
            mode={gameMode}
            onSubmit={handleSubmit}
            onPlayAgain={handlePlayAgain}
            isSubmitting={isSubmitting}
            submitError={submitError}
            isSubmitted={isSubmitted}
            scoreId={scoreId || undefined}
          />
        )}
      </div>
    </div>
  );
}
