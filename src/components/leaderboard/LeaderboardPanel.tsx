'use client';

import { useLeaderboard } from '@/hooks/useLeaderboard';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, is67RepsMode } from '@/types/game';

interface LeaderboardPanelProps {
  refreshTrigger?: number;
}

// Icons
const RefreshIcon = ({ spinning = false }: { spinning?: boolean }) => (
  <svg className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function LeaderboardPanel({ refreshTrigger }: LeaderboardPanelProps) {
  const { entries, isLoading, error, selectedDuration, setSelectedDuration, refresh } = useLeaderboard();

  // Suppress unused warning
  void refreshTrigger;

  const is67Reps = is67RepsMode(selectedDuration);

  const durations = [
    { id: DURATION_6_7S, label: '6.7s' },
    { id: DURATION_20S, label: '20s' },
    { id: DURATION_67_REPS, label: '67' },
  ];

  return (
    <div className="h-full flex flex-col glass-panel rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-white tracking-tight uppercase">Leaderboard</h2>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshIcon spinning={isLoading} />
          </button>
        </div>
        
        {/* Duration tabs */}
        <div className="flex bg-white/5 rounded-md p-0.5">
          {durations.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSelectedDuration(id)}
              className={`
                flex-1 py-1 px-2 rounded text-xs font-semibold transition-all
                ${selectedDuration === id
                  ? 'bg-accent-green text-black'
                  : 'text-white/50 hover:text-white'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-400 text-xs mb-2">{error}</p>
            <button onClick={refresh} className="text-accent-green text-xs hover:underline">
              Try again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-white/40 text-xs">No scores yet</p>
          </div>
        ) : (
          <div>
            {entries.slice(0, 50).map((entry, index) => (
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
      <div className="flex-shrink-0 px-3 py-2 border-t border-white/5">
        <span className="text-[10px] text-white/30 font-mono">
          Top 50 • Auto-refresh 60s
        </span>
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

  const getRankColor = () => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-white/40';
  };

  return (
    <div 
      className={`
        flex items-center px-3 py-1.5 transition-colors border-b border-white/5 last:border-b-0
        ${isTop3 ? 'bg-white/[0.02]' : 'hover:bg-white/[0.02]'}
      `}
      style={{
        animation: `fadeIn 0.2s ease-out ${index * 0.015}s both`
      }}
    >
      {/* Rank */}
      <div className="w-6 flex-shrink-0">
        <span className={`text-xs font-bold ${getRankColor()}`}>
          {rank}
        </span>
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0 mr-2">
        <p className={`truncate text-xs ${isTop3 ? 'text-white font-medium' : 'text-white/70'}`}>
          {username}
        </p>
      </div>

      {/* Score */}
      <div className="flex-shrink-0 text-right">
        <span className={`text-xs font-bold tabular-nums ${isTop3 ? 'text-accent-green' : 'text-white/80'}`}>
          {is67RepsMode ? formatTime(score) : score}
        </span>
        {is67RepsMode && <span className="text-white/30 text-[10px] ml-0.5">s</span>}
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center px-3 py-1.5 border-b border-white/5">
          <div className="w-6 flex-shrink-0">
            <div className="w-4 h-3 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 mr-2">
            <div className="h-3 bg-white/5 rounded w-16 animate-pulse" />
          </div>
          <div className="flex-shrink-0">
            <div className="h-3 bg-white/5 rounded w-8 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
