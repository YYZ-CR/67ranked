'use client';

interface CalibrationOverlayProps {
  progress: number; // 0-1
  bothHandsDetected: boolean;
}

const HandIcon = ({ detected = false }: { detected?: boolean }) => (
  <svg className={`w-6 h-6 sm:w-8 sm:h-8 ${detected ? 'text-accent-green' : 'text-white/30'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6.5 12V9.5a1 1 0 112 0V12m0-4V5.5a1 1 0 112 0v5m0-3.5V4a1 1 0 012 0v8m0-4.5v-1a1 1 0 112 0v7.5a6 6 0 01-6 6h-2a6 6 0 01-6-6v-3a1 1 0 012 0V12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function CalibrationOverlay({ progress, bothHandsDetected }: CalibrationOverlayProps) {
  const progressPercent = Math.round(progress * 100);
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-2">
      <div className="glass-panel px-4 sm:px-6 py-4 sm:py-6 rounded-lg sm:rounded-xl text-center max-w-[260px] sm:max-w-xs animate-fade-in">
        {/* Hand icons */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className={`p-2 sm:p-2.5 rounded-md sm:rounded-lg ${bothHandsDetected ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-white/5 border border-white/10'}`}>
            <HandIcon detected={bothHandsDetected} />
          </div>
          <div className={`p-2 sm:p-2.5 rounded-md sm:rounded-lg ${bothHandsDetected ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-white/5 border border-white/10'}`}>
            <HandIcon detected={bothHandsDetected} />
          </div>
        </div>
        
        {/* Instructions */}
        <h3 className="text-base sm:text-lg font-bold text-white mb-1">
          {bothHandsDetected ? 'Hold steady' : 'Show both hands'}
        </h3>
        <p className="text-white/40 text-xs sm:text-sm mb-3 sm:mb-4">
          {bothHandsDetected 
            ? 'Keep hands visible'
            : 'Raise both hands to the camera'
          }
        </p>
        
        {/* Progress bar */}
        <div className="w-full h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent-green rounded-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Status */}
        <p className="text-white/30 text-[10px] sm:text-xs mt-1.5 sm:mt-2">
          {bothHandsDetected ? `${progressPercent}%` : 'Waiting...'}
        </p>
      </div>
    </div>
  );
}
