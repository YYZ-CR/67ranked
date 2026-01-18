'use client';

import { useLeaderboard } from '@/hooks/useLeaderboard';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, is67RepsMode } from '@/types/game';

interface LeaderboardPanelProps {
  refreshTrigger?: number;
}

// Icons
const RefreshIcon = ({ spinning = false }: { spinning?: boolean }) => (
  <svg className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BoltIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
  </svg>
);

const TimerIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="13" r="7" />
    <path d="M12 10v3l1.5 1.5" strokeLinecap="round" />
    <path d="M10 2h4" strokeLinecap="round" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

export function LeaderboardPanel({ refreshTrigger }: LeaderboardPanelProps) {
  const { entries, isLoading, error, selectedDuration, setSelectedDuration, refresh } = useLeaderboard();

  // Suppress unused warning
  void refreshTrigger;

  const is67Reps = is67RepsMode(selectedDuration);

  const durations = [
    { id: DURATION_6_7S, label: '6.7s', icon: BoltIcon },
    { id: DURATION_20S, label: '20s', icon: TimerIcon },
    { id: DURATION_67_REPS, label: '67', icon: TargetIcon },
  ];

  return (
    <div className="h-full flex flex-col glass-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 lg:p-5 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white tracking-tight">LEADERBOARD</h2>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshIcon spinning={isLoading} />
          </button>
        </div>
        
        {/* Duration tabs */}
        <div className="flex bg-white/5 rounded-lg p-1">
          {durations.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedDuration(id)}
              className={`
                flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-1.5
                ${selectedDuration === id
                  ? 'bg-accent-green text-black'
                  : 'text-white/50 hover:text-white'
                }
              `}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button onClick={refresh} className="text-accent-green text-sm hover:underline">
              Try again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-white/40 text-sm">No scores yet</p>
            <p className="text-white/20 text-xs mt-1">Be the first!</p>
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
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-white/30 font-mono uppercase tracking-wider">
          Top 100
        </span>
        <span className="text-xs text-white/20 font-mono">
          Auto-refresh 60s
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

  const getRankDisplay = () => {
    if (rank === 1) return <span className="text-yellow-400 font-bold">#1</span>;
    if (rank === 2) return <span className="text-gray-300 font-bold">#2</span>;
    if (rank === 3) return <span className="text-amber-600 font-bold">#3</span>;
    return <span className="text-white/40 font-mono text-sm">{rank}</span>;
  };

  return (
    <div 
      className={`
        flex items-center px-4 lg:px-5 py-3 transition-colors border-b border-white/5 last:border-b-0
        ${isTop3 ? 'bg-white/[0.02]' : 'hover:bg-white/[0.02]'}
      `}
      style={{
        animation: `fadeIn 0.3s ease-out ${index * 0.02}s both`
      }}
    >
      {/* Rank */}
      <div className="w-10 flex-shrink-0">
        {getRankDisplay()}
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p className={`truncate font-medium ${isTop3 ? 'text-white' : 'text-white/70'}`}>
          {username}
        </p>
      </div>

      {/* Score */}
      <div className="flex-shrink-0 ml-3 text-right">
        <span className={`font-bold tabular-nums ${isTop3 ? 'text-accent-green text-lg' : 'text-white'}`}>
          {is67RepsMode ? formatTime(score) : score}
        </span>
        <span className="text-white/30 text-xs ml-1">{is67RepsMode ? 's' : ''}</span>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center px-4 py-3 border-b border-white/5">
          <div className="w-10 flex-shrink-0">
            <div className="w-6 h-4 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-white/5 rounded w-24 animate-pulse" />
          </div>
          <div className="flex-shrink-0 ml-3">
            <div className="h-5 bg-white/5 rounded w-12 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
