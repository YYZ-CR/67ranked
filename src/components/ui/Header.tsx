'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  showNav?: boolean;
  playerCount?: number;
}

export function Header({ showNav = true, playerCount }: HeaderProps) {
  const pathname = usePathname();
  const isDuelPage = pathname?.startsWith('/duel');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-2 py-1.5 sm:px-4 sm:py-2 bg-black/30 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo + Player count */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="flex items-center gap-1 sm:gap-1.5 group">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-accent-green rounded-md flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-[9px] sm:text-[10px] font-black text-black">67</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">RANKED</span>
          </Link>
          
          {/* Player count */}
          {playerCount !== undefined && playerCount > 0 && (
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-white/40">
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-accent-green"></span>
              <span className="text-accent-green font-medium">{playerCount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        {showNav && (
          <div className="inline-flex bg-black/50 rounded-full p-0.5 border border-white/10">
            <Link
              href="/"
              className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold transition-all ${
                !isDuelPage 
                  ? 'bg-accent-green text-black' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              SOLO
            </Link>
            <Link
              href="/duel/create"
              className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold transition-all ${
                isDuelPage 
                  ? 'bg-accent-green text-black' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              DUEL
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
