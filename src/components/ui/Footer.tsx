'use client';

interface FooterProps {
  showStatus?: boolean;
  className?: string;
}

export function Footer({ showStatus = true, className = '' }: FooterProps) {
  return (
    <footer className={`fixed bottom-0 left-0 right-0 px-3 py-2 pointer-events-none ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left status */}
        {showStatus && (
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/20 font-mono">
            <span className="flex items-center gap-1">
              <span className="status-dot"></span>
              <span className="uppercase tracking-wider">Camera</span>
            </span>
          </div>
        )}

        {/* Right info */}
        <div className="flex items-center text-[10px] text-white/20 font-mono uppercase tracking-wider ml-auto">
          <span>67ranked.com</span>
        </div>
      </div>
    </footer>
  );
}
