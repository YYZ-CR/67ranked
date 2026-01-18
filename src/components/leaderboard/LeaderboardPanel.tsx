'use client';

import { useLeaderboard } from '@/hooks/useLeaderboard';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, is67RepsMode } from '@/types/game';

interface LeaderboardPanelProps {
  refreshTrigger?: number;
}

export function LeaderboardPanel({ refreshTrigger }: LeaderboardPanelProps) {
  const { entries, isLoading, error, selectedDuration, setSelectedDuration, refresh } = useLeaderboard();

  // Refresh when trigger changes
  if (refreshTrigger) {
    // The useEffect is handled inside useLeaderboard
  }

  const is67Reps = is67RepsMode(selectedDuration);

  return (
    <div className="h-full flex flex-col bg-gray-900/50 rounded-2xl overflow-hidden">
      {/* Header with toggle */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white mb-3">🏆 Leaderboard</h2>
        
        {/* Duration toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedDuration(DURATION_6_7S)}
            className={`
              flex-1 py-2 px-3 rounded-xl font-semibold text-sm transition-all
              ${selectedDuration === DURATION_6_7S
                ? 'bg-accent-green text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
              }
            `}
          >
            6.7s
          </button>
          <button
            onClick={() => setSelectedDuration(DURATION_20S)}
            className={`
              flex-1 py-2 px-3 rounded-xl font-semibold text-sm transition-all
              ${selectedDuration === DURATION_20S
                ? 'bg-accent-green text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
              }
            `}
          >
            20s
          </button>
          <button
            onClick={() => setSelectedDuration(DURATION_67_REPS)}
            className={`
              flex-1 py-2 px-3 rounded-xl font-semibold text-sm transition-all
              ${selectedDuration === DURATION_67_REPS
                ? 'bg-accent-green text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
              }
            `}
          >
            67 Reps
          </button>
        </div>
      </div>

      {/* Leaderboard list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <button
              onClick={refresh}
              className="text-accent-green text-sm hover:underline"
            >
              Try again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-white/50 text-sm">No scores yet!</p>
            <p className="text-white/30 text-xs mt-1">Be the first to submit a score</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {entries.map((entry, index) => (
              <LeaderboardRow
                key={entry.id}
                rank={entry.rank}
                username={entry.username}
                score={entry.score}
                isTop3={entry.rank <= 3}
                index={index}
                is67RepsMode={is67Reps}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t border-white/10 text-center">
        <p className="text-white/30 text-xs">
          Top 100 • Refreshes every 60s
        </p>
      </div>
    </div>
  );
}

interface LeaderboardRowProps {
  rank: number;
  username: string;
  score: number;
  isTop3: boolean;
  index: number;
  is67RepsMode?: boolean;
}

function LeaderboardRow({ rank, username, score, isTop3, index, is67RepsMode = false }: LeaderboardRowProps) {
  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  const emoji = getRankEmoji(rank);
  
  // Format time for 67 reps mode (score is in ms)
  const formatTime = (ms: number) => (ms / 1000).toFixed(2);

  return (
    <div 
      className={`
        flex items-center px-4 py-3 transition-colors
        ${isTop3 ? 'bg-white/5' : 'hover:bg-white/5'}
      `}
      style={{
        animation: `fadeIn 0.3s ease-out ${index * 0.03}s both`
      }}
    >
      {/* Rank */}
      <div className="w-10 flex-shrink-0">
        {emoji ? (
          <span className="text-xl">{emoji}</span>
        ) : (
          <span className="text-white/50 text-sm font-mono">{rank}</span>
        )}
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p className={`
          truncate font-medium
          ${isTop3 ? 'text-white' : 'text-white/80'}
        `}>
          {username}
        </p>
      </div>

      {/* Score */}
      <div className="flex-shrink-0 ml-3">
        <span className={`
          font-bold tabular-nums
          ${isTop3 ? 'text-accent-green text-lg' : 'text-white'}
        `}>
          {is67RepsMode ? formatTime(score) : score}
        </span>
        <span className="text-white/40 text-xs ml-1">{is67RepsMode ? 's' : 'reps'}</span>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="divide-y divide-white/5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center px-4 py-3">
          <div className="w-10 flex-shrink-0">
            <div className="w-6 h-6 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
          </div>
          <div className="flex-shrink-0 ml-3">
            <div className="h-5 bg-white/10 rounded w-12 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
