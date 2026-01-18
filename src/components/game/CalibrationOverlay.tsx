'use client';

interface CalibrationOverlayProps {
  progress: number; // 0-1
  bothHandsDetected: boolean;
}

const HandIcon = ({ detected = false }: { detected?: boolean }) => (
  <svg className={`w-10 h-10 ${detected ? 'text-accent-green' : 'text-white/30'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6.5 12V9.5a1 1 0 112 0V12m0-4V5.5a1 1 0 112 0v5m0-3.5V4a1 1 0 012 0v8m0-4.5v-1a1 1 0 112 0v7.5a6 6 0 01-6 6h-2a6 6 0 01-6-6v-3a1 1 0 012 0V12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function CalibrationOverlay({ progress, bothHandsDetected }: CalibrationOverlayProps) {
  const progressPercent = Math.round(progress * 100);
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass-panel px-8 py-8 rounded-2xl text-center max-w-sm animate-fade-in">
        {/* Hand icons */}
        <div className="flex justify-center gap-4 mb-6">
          <div className={`p-3 rounded-xl ${bothHandsDetected ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-white/5 border border-white/10'}`}>
            <HandIcon detected={bothHandsDetected} />
          </div>
          <div className={`p-3 rounded-xl ${bothHandsDetected ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-white/5 border border-white/10'}`}>
            <HandIcon detected={bothHandsDetected} />
          </div>
        </div>
        
        {/* Instructions */}
        <h3 className="text-xl font-bold text-white mb-2">
          {bothHandsDetected ? 'Hold steady' : 'Raise both hands'}
        </h3>
        <p className="text-white/40 text-sm mb-6">
          {bothHandsDetected 
            ? 'Keep both hands visible and steady'
            : 'Show both hands to the camera'
          }
        </p>
        
        {/* Progress bar */}
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-accent-green rounded-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Status */}
        <div className="flex items-center justify-center gap-2">
          {bothHandsDetected && (
            <span className="status-dot"></span>
          )}
          <p className="text-white/30 text-xs font-mono uppercase tracking-wider">
            {bothHandsDetected 
              ? `Calibrating ${progressPercent}%`
              : 'Waiting for hands...'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
