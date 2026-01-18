'use client';

interface CalibrationOverlayProps {
  progress: number; // 0-1
  bothHandsDetected: boolean;
}

export function CalibrationOverlay({ progress, bothHandsDetected }: CalibrationOverlayProps) {
  const progressPercent = Math.round(progress * 100);
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
      <div className="glass-panel px-8 py-6 rounded-2xl text-center max-w-xs">
        {/* Icon */}
        <div className="text-6xl mb-4">
          {bothHandsDetected ? '✋🤚' : '👋'}
        </div>
        
        {/* Instructions */}
        <h3 className="text-xl font-bold text-white mb-2">
          {bothHandsDetected ? 'Hold steady!' : 'Raise both hands'}
        </h3>
        <p className="text-white/70 text-sm mb-4">
          {bothHandsDetected 
            ? 'Keep both hands visible and steady'
            : 'Show both hands to the camera'
          }
        </p>
        
        {/* Progress bar */}
        <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent-green rounded-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Status text */}
        <p className="text-white/50 text-xs mt-2">
          {bothHandsDetected 
            ? `${progressPercent}% calibrated`
            : 'Waiting for both hands...'
          }
        </p>
      </div>
    </div>
  );
}
