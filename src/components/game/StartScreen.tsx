'use client';

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
          <div className="text-5xl mb-4">📷</div>
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
          Move your hands to compete globally
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
          "
        >
          ▶ Start
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
