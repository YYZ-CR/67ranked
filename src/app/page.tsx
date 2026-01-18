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
      <div className="h-screen h-dvh flex flex-col lg:flex-row pt-10 sm:pt-12 pb-1 sm:pb-2 overflow-hidden">
        {/* Game Panel - Main focus, takes most space */}
        <div className="flex-1 p-1.5 sm:p-3 lg:p-4 flex items-center justify-center min-h-0">
          <GamePanel onScoreSubmitted={handleScoreSubmitted} />
        </div>

        {/* Leaderboard Panel - Sidebar on desktop, bottom sheet on mobile */}
        <div className="flex-shrink-0 lg:w-64 xl:w-72 p-1.5 sm:p-3 lg:p-4 lg:pl-0 h-[200px] sm:h-[260px] lg:h-auto overflow-hidden">
          <LeaderboardPanel refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </main>
  );
}
