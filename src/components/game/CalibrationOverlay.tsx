'use client';

import type { InitState } from '@/lib/hand-tracking';

interface CalibrationOverlayProps {
  progress: number; // 0-1
  bothHandsDetected: boolean;
  backendWarning?: string;
  initState?: InitState;
}

const HandIcon = ({ detected = false }: { detected?: boolean }) => (
  <svg className={`w-6 h-6 sm:w-8 sm:h-8 ${detected ? 'text-accent-green' : 'text-white/30'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6.5 12V9.5a1 1 0 112 0V12m0-4V5.5a1 1 0 112 0v5m0-3.5V4a1 1 0 012 0v8m0-4.5v-1a1 1 0 112 0v7.5a6 6 0 01-6 6h-2a6 6 0 01-6-6v-3a1 1 0 012 0V12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
  </svg>
);

const LoadingSpinner = () => (
  <svg className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-accent-green" viewBox="0 0 24 24" fill="none">
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="3"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export function CalibrationOverlay({ progress, bothHandsDetected, backendWarning, initState }: CalibrationOverlayProps) {
  const progressPercent = Math.round(progress * 100);
  
  // Show loading/warmup overlay when not ready
  const isInitializing = initState && initState !== 'ready' && initState !== 'idle';
  
  if (isInitializing) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-2">
        <div className="glass-panel px-4 sm:px-6 py-4 sm:py-6 rounded-lg sm:rounded-xl text-center max-w-[260px] sm:max-w-xs animate-fade-in">
          {/* Loading spinner */}
          <div className="flex justify-center mb-4">
            <LoadingSpinner />
          </div>
          
          {/* Status message */}
          <h3 className="text-base sm:text-lg font-bold text-white mb-1">
            {initState === 'loading' ? 'Loading model...' : 'Initializing tracking...'}
          </h3>
          <p className="text-white/40 text-xs sm:text-sm">
            {initState === 'loading' 
              ? 'Downloading AI model'
              : 'Warming up for best performance'
            }
          </p>
          
          {/* Indeterminate progress bar */}
          <div className="w-full h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden mt-4">
            <div 
              className="h-full bg-accent-green rounded-full animate-pulse"
              style={{ width: initState === 'warming_up' ? '80%' : '40%' }}
            />
          </div>
        </div>
      </div>
    );
  }
  
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
        <p className="text-white/40 text-xs sm:text-sm mb-2">
          {bothHandsDetected 
            ? 'Keep hands visible'
            : 'Raise both hands to the camera'
          }
        </p>
        
        {/* Tips for detection */}
        {!bothHandsDetected && (
          <p className="text-[10px] sm:text-xs text-white/30 mb-3 sm:mb-4">
            Stand back • Good lighting • Arms visible
          </p>
        )}
        
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
        
        {/* Backend warning */}
        {backendWarning && (
          <div className="flex items-center gap-1.5 mt-3 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
            <WarningIcon />
            <span className="text-yellow-500/90 text-[10px] sm:text-xs">{backendWarning}</span>
          </div>
        )}
      </div>
    </div>
  );
}
