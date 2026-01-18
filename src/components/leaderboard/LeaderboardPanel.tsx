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
    <div className="h-full flex flex-col bg-bg-secondary border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white tracking-wide">LEADERBOARD</h2>
          <button
            onClick={refresh}
            disabled={isLoading}
            className={`
              p-2 rounded-lg transition-all
              ${isLoading 
                ? 'text-white/20 cursor-not-allowed' 
                : 'text-white/50 hover:text-white hover:bg-white/10'
              }
            `}
          >
            <svg 
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>
        
        {/* Duration Tabs */}
        <div className="flex bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setSelectedDuration(DURATION_6_7S)}
            className={`
              flex-1 py-2 px-2 rounded-md text-xs font-semibold transition-all
              ${selectedDuration === DURATION_6_7S
                ? 'bg-accent-green text-black'
                : 'text-white/50 hover:text-white'
              }
            `}
          >
            6.7s
          </button>
          <button
            onClick={() => setSelectedDuration(DURATION_20S)}
            className={`
              flex-1 py-2 px-2 rounded-md text-xs font-semibold transition-all
              ${selectedDuration === DURATION_20S
                ? 'bg-accent-green text-black'
                : 'text-white/50 hover:text-white'
              }
            `}
          >
            20s
          </button>
          <button
            onClick={() => setSelectedDuration(DURATION_67_REPS)}
            className={`
              flex-1 py-2 px-2 rounded-md text-xs font-semibold transition-all
              ${selectedDuration === DURATION_67_REPS
                ? 'bg-accent-green text-black'
                : 'text-white/50 hover:text-white'
              }
            `}
          >
            67 REPS
          </button>
        </div>
      </div>

      {/* Leaderboard list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : error ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button
              onClick={refresh}
              className="text-accent-green text-xs font-semibold hover:underline"
            >
              TRY AGAIN
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 21h8M12 17V7M17 4H7M7 4L5 6M7 4l2 2M17 4l2 2M17 4l-2 2" />
              </svg>
            </div>
            <p className="text-white/50 text-sm">No scores yet</p>
            <p className="text-white/30 text-xs mt-1">Be the first!</p>
          </div>
        ) : (
          <div>
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
      <div className="flex-shrink-0 p-3 border-t border-white/5 flex items-center justify-between text-white/20 text-xs">
        <span>TOP 100</span>
        <span>AUTO-REFRESH 60s</span>
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
  const formatTime = (ms: number) => (ms / 1000).toFixed(2);

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50';
    if (rank === 2) return 'bg-gray-300/20 text-gray-300 border-gray-300/50';
    if (rank === 3) return 'bg-amber-600/20 text-amber-500 border-amber-600/50';
    return 'bg-white/5 text-white/50 border-white/10';
  };

  return (
    <div 
      className={`
        flex items-center px-4 py-3 border-b border-white/5 transition-colors hover:bg-white/5
        ${isTop3 ? 'bg-white/[0.02]' : ''}
      `}
      style={{
        animation: `fadeIn 0.3s ease-out ${index * 0.02}s both`
      }}
    >
      {/* Rank Badge */}
      <div className={`
        w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm mr-3
        ${getRankStyle(rank)}
      `}>
        {rank}
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p className={`truncate font-medium ${isTop3 ? 'text-white' : 'text-white/70'}`}>
          {username}
        </p>
      </div>

      {/* Score */}
      <div className="flex-shrink-0 ml-3 text-right">
        <span className={`font-mono font-bold ${isTop3 ? 'text-accent-green text-lg' : 'text-white'}`}>
          {is67RepsMode ? formatTime(score) : score.toLocaleString()}
        </span>
        <span className="text-white/30 text-xs ml-1">{is67RepsMode ? 's' : 'reps'}</span>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center px-4 py-3 border-b border-white/5">
          <div className="w-8 h-8 bg-white/5 rounded-lg animate-pulse mr-3" />
          <div className="flex-1">
            <div className="h-4 bg-white/5 rounded w-24 animate-pulse" />
          </div>
          <div className="w-16">
            <div className="h-5 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
