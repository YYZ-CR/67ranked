'use client';

import Link from 'next/link';

interface HeaderProps {
  showNav?: boolean;
}

export function Header({ showNav = true }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 lg:px-6 lg:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 lg:w-9 lg:h-9 bg-accent-green rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="text-sm lg:text-base font-black text-black">67</span>
          </div>
          <span className="text-lg lg:text-xl font-bold text-white tracking-tight">RANKED</span>
        </Link>

        {/* Nav Links */}
        {showNav && (
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className="text-sm font-medium text-white/60 hover:text-white transition-colors uppercase tracking-wider"
            >
              Home
            </Link>
            <Link 
              href="/duel/create" 
              className="text-sm font-medium text-white/60 hover:text-white transition-colors uppercase tracking-wider"
            >
              Duel
            </Link>
          </nav>
        )}

        {/* Status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-white/40">
            <span className="status-dot"></span>
            <span className="font-mono uppercase tracking-wider">Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}
