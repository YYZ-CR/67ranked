'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { HandTracker, TrackingState, RepCounter, CalibrationTracker } from '@/lib/hand-tracking';

export interface UseHandTrackingReturn {
  // Refs to attach to video/canvas elements
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  
  // State
  isInitialized: boolean;
  isRunning: boolean;
  trackingState: TrackingState | null;
  error: string | null;
  
  // Rep counting (using refs for performance)
  repCountRef: React.RefObject<number>;
  
  // Actions
  initialize: () => Promise<void>;
  start: () => void;
  stop: () => void;
  cleanup: () => void;
  resetCalibration: () => void;
  resetRepCounter: () => void;
  
  // Mode-specific processors
  processCalibrationFrame: () => boolean;
  processGameplayFrame: () => boolean;
}

export function useHandTracking(): UseHandTrackingReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const repCounterRef = useRef<RepCounter | null>(null);
  const calibrationTrackerRef = useRef<CalibrationTracker | null>(null);
  const repCountRef = useRef<number>(0);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [trackingState, setTrackingState] = useState<TrackingState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize hand tracking
  const initialize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Video or canvas element not available');
      return;
    }
    
    try {
      setError(null);
      
      const tracker = new HandTracker();
      trackerRef.current = tracker;
      
      // Create separate instances for calibration and gameplay
      repCounterRef.current = new RepCounter();
      calibrationTrackerRef.current = new CalibrationTracker();
      
      await tracker.initialize(
        videoRef.current,
        canvasRef.current,
        (state) => {
          setTrackingState(state);
        }
      );
      
      setIsInitialized(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize camera';
      
      if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
        setError('Camera permission denied. Please allow camera access and reload.');
      } else if (message.includes('NotFoundError')) {
        setError('No camera found. Please connect a camera and reload.');
      } else {
        setError(message);
      }
    }
  }, []);

  // Start tracking loop
  const start = useCallback(() => {
    if (trackerRef.current && isInitialized) {
      trackerRef.current.start();
      setIsRunning(true);
    }
  }, [isInitialized]);

  // Stop tracking loop
  const stop = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.stop();
      setIsRunning(false);
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.cleanup();
      trackerRef.current = null;
    }
    setIsInitialized(false);
    setIsRunning(false);
    setTrackingState(null);
  }, []);

  // Reset calibration tracker
  const resetCalibration = useCallback(() => {
    calibrationTrackerRef.current?.reset();
  }, []);

  // Reset rep counter
  const resetRepCounter = useCallback(() => {
    repCounterRef.current?.reset();
    repCountRef.current = 0;
  }, []);

  // Process frame for calibration mode
  const processCalibrationFrame = useCallback((): boolean => {
    if (!calibrationTrackerRef.current || !trackingState) return false;
    return calibrationTrackerRef.current.processFrame(trackingState.bothHandsDetected);
  }, [trackingState]);

  // Process frame for gameplay mode - uses pose wrist tracking internally
  const processGameplayFrame = useCallback((): boolean => {
    if (!trackerRef.current) return false;
    
    // Tracker handles everything internally using pose wrist data
    const repCompleted = trackerRef.current.processGameplay(null, null);
    
    if (repCompleted) {
      repCountRef.current = trackerRef.current.getRepCount();
    }
    
    return repCompleted;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    videoRef,
    canvasRef,
    isInitialized,
    isRunning,
    trackingState,
    error,
    repCountRef,
    initialize,
    start,
    stop,
    cleanup,
    resetCalibration,
    resetRepCounter,
    processCalibrationFrame,
    processGameplayFrame
  };
}
