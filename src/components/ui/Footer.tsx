'use client';

interface FooterProps {
  showStatus?: boolean;
  className?: string;
}

export function Footer({ showStatus = true, className = '' }: FooterProps) {
  return (
    <footer className={`fixed bottom-0 left-0 right-0 px-4 py-3 lg:px-6 lg:py-4 pointer-events-none ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left status */}
        {showStatus && (
          <div className="flex items-center gap-4 text-xs text-white/30 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="status-dot"></span>
              <span className="uppercase tracking-wider">Camera Active</span>
            </span>
          </div>
        )}

        {/* Right info */}
        <div className="flex items-center gap-4 text-xs text-white/30 font-mono uppercase tracking-wider ml-auto">
          <span>© 2025 67Ranked</span>
        </div>
      </div>
    </footer>
  );
}
