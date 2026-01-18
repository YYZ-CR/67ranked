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

function formatSpeedrunTime(ms: number): string {
  const seconds = Math.max(0, ms / 1000);
  return seconds.toFixed(2);
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
  const nearFinish = is67RepsMode && repsToGo !== null && repsToGo <= 10 && repsToGo > 0;
  
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* Top bar with rep counter */}
      <div className="flex justify-center pt-4">
        <div className="bg-black/70 backdrop-blur-md border border-white/10 px-6 py-3 rounded-xl flex items-center gap-3">
          <span className={`text-5xl font-black tabular-nums font-mono ${
            (is67RepsMode && repCount >= 60) || nearFinish ? 'text-accent-green' : 'text-white'
          }`}>
            {repCount}
          </span>
          <span className="text-white/40 text-lg">
            {is67RepsMode ? '/ 67' : 'REPS'}
          </span>
        </div>
      </div>

      {/* Center warning */}
      {(trackingLost || showWarning) ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-yellow-500/10 border border-yellow-500/30 px-6 py-4 rounded-xl animate-pulse">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-yellow-400 text-lg font-semibold">
                {trackingLost ? 'HANDS NOT DETECTED' : warningMessage}
              </p>
            </div>
          </div>
        </div>
      ) : nearFinish ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-accent-green/10 border border-accent-green/30 px-8 py-4 rounded-xl">
            <p className="text-accent-green text-4xl font-black text-center tabular-nums">
              {repsToGo}
              <span className="text-lg ml-2 opacity-70">TO GO</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Bottom timer bar */}
      <div className="flex justify-center pb-4">
        <div className="bg-black/70 backdrop-blur-md border border-white/10 px-8 py-3 rounded-xl flex items-center gap-2">
          <span className="text-4xl font-mono font-black text-white tabular-nums">
            {is67RepsMode ? formatSpeedrunTime(displayTime) : formatTime(displayTime)}
          </span>
          <span className="text-white/40 text-lg">S</span>
        </div>
      </div>
    </div>
  );
}
