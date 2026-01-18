'use client';

import Link from 'next/link';

interface HeaderProps {
  showNav?: boolean;
  playerCount?: number;
}

export function Header({ showNav = true, playerCount }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 py-2 sm:px-4 sm:py-2.5 bg-black/30 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo + Player count */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="flex items-center gap-1.5 group">
            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-accent-green rounded-md flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-[10px] sm:text-xs font-black text-black">67</span>
            </div>
            <span className="text-sm sm:text-base font-bold text-white tracking-tight">RANKED</span>
          </Link>
          
          {/* Player count */}
          {playerCount !== undefined && playerCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green"></span>
              <span><span className="text-accent-green font-medium">{playerCount.toLocaleString()}</span></span>
            </div>
          )}
        </div>

        {/* Nav Links */}
        {showNav && (
          <nav className="flex items-center">
            <Link 
              href="/duel/create" 
              className="text-xs font-medium text-white/50 hover:text-white transition-colors px-2 py-1"
            >
              Duel
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
