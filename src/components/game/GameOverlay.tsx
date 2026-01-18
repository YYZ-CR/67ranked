'use client';

import { formatTime } from '@/hooks/useGameState';

interface GameOverlayProps {
  repCount: number;
  timeRemaining: number;
  elapsedTime?: number;
  is67RepsMode?: boolean;
  trackingLost?: boolean;
  showWarning?: boolean;
  warningMessage?: string;
}

export function GameOverlay({
  repCount,
  timeRemaining,
  elapsedTime = 0,
  is67RepsMode = false,
  trackingLost = false,
  showWarning = false,
  warningMessage = ''
}: GameOverlayProps) {
  const displayTime = is67RepsMode ? elapsedTime : timeRemaining;
  const repsToGo = is67RepsMode ? 67 - repCount : null;
  
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* Top bar with rep counter */}
      <div className="flex justify-center pt-4">
        <div className="glass-panel px-6 py-3 rounded-full">
          <span className={`text-4xl font-bold tabular-nums ${is67RepsMode && repCount >= 60 ? 'text-accent-green' : 'text-white'}`}>
            {repCount}
          </span>
          <span className="text-xl text-white/70 ml-2">
            {is67RepsMode ? `/ 67` : 'reps'}
          </span>
        </div>
      </div>

      {/* Center warning or progress */}
      {(trackingLost || showWarning) ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="glass-panel-warning px-6 py-4 rounded-xl animate-pulse">
            <p className="text-yellow-300 text-lg font-semibold text-center">
              {trackingLost 
                ? '⚠️ Hands not detected — move both hands into frame!'
                : warningMessage
              }
            </p>
          </div>
        </div>
      ) : is67RepsMode && repsToGo !== null && repsToGo <= 10 && repsToGo > 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="glass-panel px-8 py-4 rounded-xl">
            <p className="text-accent-green text-3xl font-bold text-center animate-pulse">
              {repsToGo} to go!
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Bottom timer bar */}
      <div className="flex justify-center pb-4">
        <div className="glass-panel px-8 py-3 rounded-full">
          <span className="text-3xl font-mono font-bold text-white tabular-nums">
            {formatTime(displayTime)}
          </span>
          <span className="text-lg text-white/70 ml-1">s</span>
        </div>
      </div>
    </div>
  );
}
