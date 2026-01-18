'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, GameMode, DURATION_6_7S, DURATION_20S } from '@/types/game';

export interface UseGameStateReturn {
  // State
  gameState: GameState;
  gameMode: GameMode;
  duration: number;
  customDuration: number;
  timeRemaining: number;
  countdownValue: number;
  finalScore: number;
  
  // Refs for performance-critical updates
  timeRemainingRef: React.RefObject<number>;
  
  // Actions
  setGameState: (state: GameState) => void;
  setGameMode: (mode: GameMode) => void;
  setDuration: (ms: number) => void;
  setCustomDuration: (ms: number) => void;
  startCountdown: () => Promise<void>;
  startGame: () => void;
  endGame: (score: number) => void;
  resetGame: () => void;
}

export function useGameState(): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [gameMode, setGameMode] = useState<GameMode>('normal');
  const [duration, setDuration] = useState<number>(DURATION_6_7S);
  const [customDuration, setCustomDuration] = useState<number>(10000);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [countdownValue, setCountdownValue] = useState<number>(3);
  const [finalScore, setFinalScore] = useState<number>(0);
  
  const timeRemainingRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Countdown sequence (3, 2, 1, GO!)
  const startCountdown = useCallback(async (): Promise<void> => {
    setGameState('countdown');
    setCountdownValue(3);
    
    return new Promise((resolve) => {
      let count = 3;
      
      const countdownTick = () => {
        if (count > 0) {
          setCountdownValue(count);
          count--;
          timerRef.current = setTimeout(countdownTick, 1000);
        } else {
          setCountdownValue(0); // "GO!"
          resolve();
        }
      };
      
      countdownTick();
    });
  }, []);

  // Start the game timer
  const startGame = useCallback(() => {
    const selectedDuration = duration;
    
    setGameState('playing');
    setTimeRemaining(selectedDuration);
    timeRemainingRef.current = selectedDuration;
    startTimeRef.current = performance.now();
    
    // High-precision timer using requestAnimationFrame
    const updateTimer = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, selectedDuration - elapsed);
      
      timeRemainingRef.current = remaining;
      setTimeRemaining(remaining);
      
      if (remaining > 0) {
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(updateTimer);
  }, [duration]);

  // End the game
  const endGame = useCallback((score: number) => {
    clearTimers();
    setFinalScore(score);
    setGameState('ended');
    setTimeRemaining(0);
    timeRemainingRef.current = 0;
  }, [clearTimers]);

  // Reset everything
  const resetGame = useCallback(() => {
    clearTimers();
    setGameState('idle');
    setTimeRemaining(0);
    setCountdownValue(3);
    setFinalScore(0);
    timeRemainingRef.current = 0;
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    gameState,
    gameMode,
    duration,
    customDuration,
    timeRemaining,
    countdownValue,
    finalScore,
    timeRemainingRef,
    setGameState,
    setGameMode,
    setDuration,
    setCustomDuration,
    startCountdown,
    startGame,
    endGame,
    resetGame
  };
}

// Duration helpers
export const DURATION_OPTIONS = [
  { label: '6.7s', value: DURATION_6_7S },
  { label: '20s', value: DURATION_20S },
  { label: 'Custom', value: -1 }
] as const;

export function formatTime(ms: number): string {
  const seconds = Math.max(0, ms / 1000);
  return seconds.toFixed(1);
}

export function isLeaderboardEligible(duration: number): boolean {
  return duration === DURATION_6_7S || duration === DURATION_20S;
}
