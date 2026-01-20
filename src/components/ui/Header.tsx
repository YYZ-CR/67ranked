'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface HeaderProps {
  showNav?: boolean;
}

export function Header({ showNav = true }: HeaderProps) {
  const pathname = usePathname();
  const isDuelPage = pathname?.startsWith('/duel');
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setPlayerCount(data.totalGames || 0);
        }
      } catch {
        // Silently fail
      }
    };
    fetchStats();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 py-2 sm:px-4 sm:py-2.5 bg-black/30 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          <Link href="/" className="flex items-center gap-1.5 group">
            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-accent-green rounded-md flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-[10px] sm:text-xs font-black text-black">67</span>
            </div>
            <span className="text-sm sm:text-base font-bold text-white tracking-tight">RANKED</span>
          </Link>
        </div>

        {/* Mode Toggle - Centered */}
        {showNav && (
          <div className="inline-flex bg-black/50 rounded-full p-0.5 border border-white/10">
            <Link
              href="/"
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                !isDuelPage 
                  ? 'bg-accent-green text-black' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              SOLO
            </Link>
            <Link
              href="/duel"
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                isDuelPage 
                  ? 'bg-accent-green text-black' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              DUEL
            </Link>
          </div>
        )}

        {/* Player count - Right side */}
        <div className="flex-1 flex justify-end">
          {playerCount !== null && playerCount > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-white/40 bg-black/50 px-3 py-1.5 rounded-full border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green"></span>
              <span className="text-accent-green font-medium">{playerCount.toLocaleString()}</span>
              <span>users</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
