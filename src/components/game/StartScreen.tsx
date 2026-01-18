'use client';

interface StartScreenProps {
  onStart: () => void;
  error?: string | null;
  onRetry?: () => void;
}

const PlayIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const CameraIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

export function StartScreen({ onStart, error, onRetry }: StartScreenProps) {
  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="glass-panel p-8 rounded-2xl max-w-sm w-full mx-4 text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <CameraIcon />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Camera Required</h3>
          <p className="text-white/50 text-sm mb-6">{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="btn-primary w-full">
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-center px-4 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-14 h-14 bg-accent-green rounded-xl flex items-center justify-center green-glow">
            <span className="text-2xl font-black text-black">67</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">RANKED</h1>
        </div>
        
        {/* Tagline */}
        <p className="text-white/40 mb-10 text-sm font-mono uppercase tracking-wider">
          How fast can you 67?
        </p>
        
        {/* Start Button */}
        <button
          onClick={onStart}
          className="btn-primary text-lg px-12 py-4 animate-pulse-glow"
        >
          <PlayIcon />
          START
        </button>
        
        {/* Instructions */}
        <div className="mt-10 max-w-xs mx-auto space-y-3">
          <p className="text-white/30 text-xs font-mono uppercase tracking-wider">
            Alternate your hands up and down to count reps
          </p>
        </div>
      </div>
    </div>
  );
}
