'use client';

import Link from 'next/link';

interface HeaderProps {
  showNav?: boolean;
  playerCount?: number;
}

export function Header({ showNav = true, playerCount }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 py-2 sm:px-4 sm:py-3 bg-bg-primary/80 backdrop-blur-sm border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo + Player count */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/" className="flex items-center gap-1.5 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-accent-green rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-xs sm:text-sm font-black text-black">67</span>
            </div>
            <span className="text-base sm:text-lg font-bold text-white tracking-tight">RANKED</span>
          </Link>
          
          {/* Player count */}
          {playerCount !== undefined && playerCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="status-dot"></span>
              <span><span className="text-accent-green font-semibold">{playerCount.toLocaleString()}</span> players</span>
            </div>
          )}
        </div>

        {/* Nav Links */}
        {showNav && (
          <nav className="flex items-center gap-3 sm:gap-4">
            <Link 
              href="/duel/create" 
              className="text-xs font-medium text-white/50 hover:text-white transition-colors"
            >
              Duel
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
