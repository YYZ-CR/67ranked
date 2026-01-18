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
        <div className="fixed top-16 lg:top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-accent-green/20 flex items-center gap-2">
            <span className="status-dot"></span>
            <span className="text-white/50 text-xs font-mono uppercase tracking-wider">
              <span className="text-accent-green font-semibold">{stats.totalGames.toLocaleString()}</span> players
            </span>
          </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col lg:flex-row pt-16 lg:pt-20 pb-16">
        {/* Game Panel */}
        <div className="flex-shrink-0 lg:flex-1 lg:max-w-[600px] p-4 lg:p-6 flex items-center justify-center">
          <GamePanel onScoreSubmitted={handleScoreSubmitted} />
        </div>

        {/* Leaderboard Panel */}
        <div className="flex-1 p-4 lg:p-6 lg:pl-0 min-h-[400px] lg:min-h-0">
          <div className="h-full lg:h-[calc(100vh-160px)] max-h-[600px] lg:max-h-none">
            <LeaderboardPanel refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
