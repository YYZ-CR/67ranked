'use client';

import { useState, useCallback, useEffect } from 'react';
import { GamePanel } from '@/components/game';
import { LeaderboardPanel } from '@/components/leaderboard';

interface Stats {
  totalGames: number;
  totalPlayers: number;
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
    // Trigger leaderboard refresh and stats refresh
    setRefreshTrigger(prev => prev + 1);
    fetchStats();
  }, [fetchStats]);

  return (
    <main className="h-screen w-screen overflow-hidden bg-bg-primary bg-grid-pattern">
      {/* Stats banner */}
      {stats && stats.totalGames > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-center py-2 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
            <span className="text-white/60 text-sm">
              🎮 <span className="text-accent-green font-semibold">{stats.totalPlayers.toLocaleString()}</span> players
              {' • '}
              <span className="text-accent-green font-semibold">{stats.totalGames.toLocaleString()}</span> games played
            </span>
          </div>
        </div>
      )}

      <div className="h-full w-full flex flex-col lg:flex-row">
        {/* Game Panel - Top on mobile, Left on desktop */}
        <div className="flex-shrink-0 lg:flex-shrink-0 lg:w-[520px] p-4 flex items-center justify-center">
          <GamePanel onScoreSubmitted={handleScoreSubmitted} />
        </div>

        {/* Leaderboard Panel - Bottom on mobile, Right on desktop */}
        <div className="flex-1 min-h-0 lg:min-w-0 p-4 lg:pl-0">
          <div className="h-full max-h-[400px] lg:max-h-full">
            <LeaderboardPanel refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </main>
  );
}
