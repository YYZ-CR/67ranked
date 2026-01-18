'use client';

import { useState, useCallback } from 'react';
import { GamePanel } from '@/components/game';
import { LeaderboardPanel } from '@/components/leaderboard';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleScoreSubmitted = useCallback(() => {
    // Trigger leaderboard refresh
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-bg-primary bg-grid-pattern">
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
