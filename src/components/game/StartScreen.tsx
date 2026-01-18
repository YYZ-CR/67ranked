'use client';

import { PlayIcon } from '@/components/ui/Icons';

interface StartScreenProps {
  onStart: () => void;
  error?: string | null;
  onRetry?: () => void;
}

export function StartScreen({ onStart, error, onRetry }: StartScreenProps) {
  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80">
        <div className="glass-panel p-6 rounded-2xl max-w-sm w-full mx-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
          <p className="text-white/70 text-sm mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-3 rounded-xl bg-accent-green text-black font-semibold hover:bg-accent-green/90 transition-all"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
      <div className="text-center">
        {/* Logo/Title */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 bg-accent-green rounded-xl flex items-center justify-center">
            <span className="text-2xl font-black text-black">67</span>
          </div>
          <h1 className="text-4xl font-black text-white">RANKED</h1>
        </div>
        <p className="text-white/60 mb-8 text-sm">
          How fast can you 67?
        </p>
        
        {/* Start button */}
        <button
          onClick={onStart}
          className="
            px-12 py-4 rounded-2xl
            bg-accent-green text-black
            text-xl font-bold
            hover:bg-accent-green/90
            hover:scale-105
            active:scale-95
            transition-all duration-200
            shadow-lg shadow-accent-green/30
            animate-pulse-glow
            inline-flex items-center justify-center gap-3
            mx-auto
          "
        >
          <PlayIcon size={24} />
          Start
        </button>
        
        {/* Instructions */}
        <div className="mt-8 max-w-xs mx-auto">
          <p className="text-white/40 text-xs">
            Alternate your hands up and down to count reps
          </p>
        </div>
      </div>
    </div>
  );
}
