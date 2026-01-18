'use client';

import { useState, useCallback, useEffect } from 'react';
import { GamePanel } from '@/components/game';
import { LeaderboardPanel } from '@/components/leaderboard';

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
    <main className="h-screen w-screen overflow-hidden bg-bg-primary bg-grid-pattern relative">
      {/* Top Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-2 flex items-center justify-between pointer-events-none">
        {/* Logo */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-8 h-8 bg-accent-green rounded-lg flex items-center justify-center">
            <span className="text-sm font-black text-black">67</span>
          </div>
          <span className="text-white font-bold tracking-tight hidden sm:inline">RANKED</span>
        </div>

        {/* Stats */}
        {stats && stats.totalGames > 0 && (
          <div className="bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
            <span className="text-white/50 text-xs tracking-wider">
              <span className="text-accent-green font-bold">{stats.totalGames.toLocaleString()}</span> PLAYERS
            </span>
          </div>
        )}

        {/* Nav Links */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <a 
            href="/duel/create" 
            className="text-white/50 hover:text-white text-xs tracking-wider transition-colors"
          >
            DUEL
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-full w-full flex flex-col lg:flex-row pt-12">
        {/* Game Panel */}
        <div className="flex-shrink-0 lg:flex-shrink-0 lg:w-[520px] p-4 flex items-center justify-center">
          <GamePanel onScoreSubmitted={handleScoreSubmitted} />
        </div>

        {/* Leaderboard Panel */}
        <div className="flex-1 min-h-0 lg:min-w-0 p-4 lg:pl-0">
          <div className="h-full max-h-[400px] lg:max-h-full">
            <LeaderboardPanel refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-2 flex items-center justify-between text-white/20 text-xs pointer-events-none">
        <span className="hidden sm:inline">HAND TRACKING: ACTIVE • LATENCY: 4MS</span>
        <span>67RANKED.COM</span>
      </div>
    </main>
  );
}
