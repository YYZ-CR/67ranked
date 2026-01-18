'use client';

import { useState, useCallback, useEffect } from 'react';
import { GamePanel } from '@/components/game';
import { LeaderboardPanel } from '@/components/leaderboard';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';

interface Stats {
  totalGames: number;
}

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleScoreSubmitted = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    fetchStats();
  }, [fetchStats]);

  return (
    <main className="min-h-screen w-full bg-bg-primary bg-grid-pattern bg-gradient-radial overflow-x-hidden">
      <Header />
      
      {/* Stats pill */}
      {stats && stats.totalGames > 0 && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-accent-green/20 flex items-center gap-1.5">
            <span className="status-dot"></span>
            <span className="text-white/50 text-xs font-mono">
              <span className="text-accent-green font-semibold">{stats.totalGames.toLocaleString()}</span> players
            </span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="h-screen flex flex-col lg:flex-row pt-12 pb-12 overflow-hidden">
        {/* Game Panel - Main focus, takes most space */}
        <div className="flex-1 p-2 sm:p-4 flex items-center justify-center min-h-0">
          <GamePanel onScoreSubmitted={handleScoreSubmitted} />
        </div>

        {/* Leaderboard Panel - Sidebar on desktop, bottom sheet on mobile */}
        <div className="flex-shrink-0 lg:w-72 xl:w-80 p-2 sm:p-4 lg:pl-0 h-[280px] sm:h-[320px] lg:h-auto overflow-hidden">
          <LeaderboardPanel refreshTrigger={refreshTrigger} />
        </div>
      </div>

      <Footer />
    </main>
  );
}
