'use client';

interface CountdownOverlayProps {
  value: number; // 3, 2, 1, 0 (0 = GO!)
}

export function CountdownOverlay({ value }: CountdownOverlayProps) {
  const displayValue = value === 0 ? 'GO!' : value.toString();
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Use key to force re-render and restart CSS animation */}
      <div 
        key={value}
        className="text-center animate-countdown"
      >
        <span 
          className={`
            text-6xl sm:text-8xl lg:text-9xl font-black
            ${value === 0 ? 'text-accent-green' : 'text-white'}
          `}
          style={{
            fontStyle: 'italic',
            textShadow: value === 0 
              ? '0 0 80px rgba(74, 222, 128, 0.6)' 
              : '0 0 60px rgba(255, 255, 255, 0.3)'
          }}
        >
          {displayValue}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-white/10">
        <div 
          className="h-full bg-accent-green transition-all duration-1000 ease-linear"
          style={{ width: `${((4 - value) / 4) * 100}%` }}
        />
      </div>
    </div>
  );
}
