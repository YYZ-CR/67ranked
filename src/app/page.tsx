'use client';

import { useState, useCallback, useEffect } from 'react';
import { GamePanel } from '@/components/game';
import { LeaderboardPanel } from '@/components/leaderboard';
import { Header } from '@/components/ui/Header';

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
    <main className="min-h-screen min-h-dvh w-full bg-bg-primary bg-grid-pattern bg-gradient-radial overflow-x-hidden">
      <Header playerCount={stats?.totalGames} />

      {/* Main content - use dvh for mobile browsers with dynamic viewport */}
      <div className="h-screen h-dvh flex flex-col lg:flex-row pt-11 sm:pt-12 pb-1 overflow-hidden">
        {/* Game Panel - constrained on mobile to leave room for leaderboard */}
        <div className="flex-shrink-0 h-[55%] sm:h-[60%] lg:h-auto lg:flex-1 p-1 sm:p-2 lg:p-3 flex items-center justify-center">
          <GamePanel onScoreSubmitted={handleScoreSubmitted} />
        </div>

        {/* Leaderboard Panel - more visible on mobile */}
        <div className="flex-1 lg:flex-shrink-0 lg:w-56 xl:w-64 p-1 sm:p-2 lg:p-3 lg:pl-0 min-h-0 overflow-hidden">
          <LeaderboardPanel refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </main>
  );
}
