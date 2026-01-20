'use client';

import { useState, useCallback, useEffect } from 'react';
import { GamePanel } from '@/components/game';
import { LeaderboardPanel } from '@/components/leaderboard';
import { Header } from '@/components/ui/Header';

interface Stats {
  totalGames: number;
}

// Leaderboard icon for minimized state - simple trophy
const LeaderboardIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 3h12v6a6 6 0 1 1-12 0V3Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 5H4a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 5h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 15v3M8 21h8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLeaderboardMinimized, setIsLeaderboardMinimized] = useState(false);

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
      <Header />

      {/* Main content - use dvh for mobile browsers with dynamic viewport */}
      <div className="h-screen h-dvh flex flex-col lg:block pt-14 sm:pt-12 pb-10 px-4 sm:px-2 lg:px-3 overflow-hidden relative">
        {/* Game Panel - centered, takes full width when leaderboard minimized */}
        <div className={`flex-shrink-0 h-[55%] sm:h-[60%] lg:h-full py-1 sm:p-2 lg:p-3 flex items-center justify-center transition-all duration-300 ${isLeaderboardMinimized ? '' : 'lg:pr-80 xl:pr-88 2xl:pr-[420px]'}`}>
          <GamePanel onScoreSubmitted={handleScoreSubmitted} />
        </div>

        {/* Leaderboard Panel - absolutely positioned on desktop with animation from bottom-right */}
        <div className={`
          flex-1 lg:fixed lg:right-3 lg:top-14 lg:bottom-10 
          py-1 sm:p-2 lg:p-3 min-h-0 overflow-hidden
          transition-all duration-300 ease-out
          ${isLeaderboardMinimized 
            ? 'lg:opacity-0 lg:scale-90 lg:origin-bottom-right lg:translate-y-[calc(100%-80px)] lg:translate-x-[calc(100%-200px)] lg:pointer-events-none' 
            : 'lg:w-72 xl:w-80 2xl:w-96 lg:opacity-100 lg:scale-100 lg:translate-x-0 lg:translate-y-0'
          }
        `}>
            <LeaderboardPanel 
              refreshTrigger={refreshTrigger} 
              onMinimize={() => setIsLeaderboardMinimized(true)}
              showMinimizeButton={true}
            />
        </div>

        {/* Minimized leaderboard button - bottom right with animation */}
        <button
          onClick={() => setIsLeaderboardMinimized(false)}
          aria-label="Show Leaderboard"
          className={`
            hidden lg:flex fixed bottom-14 right-4 z-[60] items-center justify-center
            w-11 h-11 bg-white/5 text-white/70 rounded-lg
            border border-white/10 hover:bg-white/10 hover:text-white
            active:scale-95 transition-all duration-300 ease-out
            ${isLeaderboardMinimized 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-90 pointer-events-none'
            }
          `}
        >
          <LeaderboardIcon />
        </button>
      </div>
    </main>
  );
}
