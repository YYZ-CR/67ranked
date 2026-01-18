'use client';

import { formatTime } from '@/hooks/useGameState';

interface GameOverlayProps {
  repCount: number;
  timeRemaining: number;
  trackingLost?: boolean;
  showWarning?: boolean;
  warningMessage?: string;
}

export function GameOverlay({
  repCount,
  timeRemaining,
  trackingLost = false,
  showWarning = false,
  warningMessage = ''
}: GameOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* Top bar with rep counter */}
      <div className="flex justify-center pt-4">
        <div className="glass-panel px-6 py-3 rounded-full">
          <span className="text-4xl font-bold text-white tabular-nums">
            {repCount}
          </span>
          <span className="text-xl text-white/70 ml-2">reps</span>
        </div>
      </div>

      {/* Center warning */}
      {(trackingLost || showWarning) && (
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
      )}

      {/* Spacer when no warning */}
      {!trackingLost && !showWarning && <div className="flex-1" />}

      {/* Bottom timer bar */}
      <div className="flex justify-center pb-4">
        <div className="glass-panel px-8 py-3 rounded-full">
          <span className="text-3xl font-mono font-bold text-white tabular-nums">
            {formatTime(timeRemaining)}
          </span>
          <span className="text-lg text-white/70 ml-1">s</span>
        </div>
      </div>
    </div>
  );
}
