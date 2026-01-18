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

// Format time with 2 decimal places for speedrun precision
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
  const isNearFinish = is67RepsMode && repsToGo !== null && repsToGo <= 10 && repsToGo > 0;
  
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* Top bar with rep counter */}
      <div className="flex justify-center pt-4">
        <div className="glass-panel px-6 py-3 rounded-full flex items-center gap-2">
          <span className={`text-4xl font-bold tabular-nums ${
            is67RepsMode && repCount >= 60 ? 'text-accent-green' : 'text-white'
          }`} style={{ fontStyle: 'italic' }}>
            {repCount}
          </span>
          <span className="text-lg text-white/40 font-mono">
            {is67RepsMode ? '/ 67' : 'reps'}
          </span>
        </div>
      </div>

      {/* Center warning */}
      {(trackingLost || showWarning) ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="glass-panel-warning px-6 py-4 rounded-xl">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
              </svg>
              <p className="text-yellow-300 text-lg font-semibold">
                {trackingLost ? 'Hands not detected' : warningMessage}
              </p>
            </div>
          </div>
        </div>
      ) : isNearFinish ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="glass-panel px-8 py-4 rounded-xl border border-accent-green/30">
            <p className="text-accent-green text-3xl font-bold text-center tabular-nums" style={{ fontStyle: 'italic' }}>
              {repsToGo}
            </p>
            <p className="text-accent-green/60 text-sm text-center font-mono uppercase tracking-wider">
              to go
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Bottom timer bar */}
      <div className="flex justify-center pb-4">
        <div className="glass-panel px-8 py-3 rounded-full flex items-center gap-2">
          <span className="text-3xl font-bold text-white tabular-nums" style={{ fontStyle: 'italic' }}>
            {is67RepsMode ? formatSpeedrunTime(displayTime) : formatTime(displayTime)}
          </span>
          <span className="text-lg text-white/40">s</span>
        </div>
      </div>
    </div>
  );
}
