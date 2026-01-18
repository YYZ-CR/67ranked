'use client';

interface StartScreenProps {
  onStart: () => void;
  error?: string | null;
  onRetry?: () => void;
}

export function StartScreen({ onStart, error, onRetry }: StartScreenProps) {
  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/90">
        <div className="bg-bg-secondary border border-white/10 p-8 rounded-2xl max-w-sm w-full mx-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">CAMERA ERROR</h3>
          <p className="text-white/50 text-sm mb-6">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-3 rounded-xl bg-accent-green text-black font-bold hover:bg-accent-green/90 transition-all"
            >
              TRY AGAIN
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-center">
        {/* Logo/Title */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="w-14 h-14 bg-accent-green rounded-xl flex items-center justify-center shadow-lg shadow-accent-green/30">
            <span className="text-3xl font-black text-black">67</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">RANKED</h1>
        </div>
        
        <p className="text-white/40 mb-10 text-sm tracking-wider">
          HOW FAST CAN YOU 67?
        </p>
        
        {/* Start button */}
        <button
          onClick={onStart}
          className="
            px-16 py-5 rounded-xl
            bg-accent-green text-black
            text-lg font-bold tracking-wide
            hover:bg-accent-green/90
            hover:scale-[1.02]
            active:scale-[0.98]
            transition-all duration-200
            shadow-lg shadow-accent-green/20
            animate-pulse-glow
            inline-flex items-center justify-center gap-3
          "
        >
          START GAME
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        
        {/* Status Bar */}
        <div className="mt-10 flex items-center justify-center gap-6 text-white/20 text-xs tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
            <span>CAMERA ACTIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>OPTIMAL LIGHTING</span>
          </div>
        </div>
      </div>
    </div>
  );
}
