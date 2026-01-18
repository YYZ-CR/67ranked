'use client';

import { useState, useEffect } from 'react';
import { GameResult, DURATION_6_7S, DURATION_20S, DURATION_67_REPS, is67RepsMode } from '@/types/game';

interface EndScreenProps {
  result: GameResult;
  duration: number;
  elapsedTime?: number;
  mode: 'normal' | 'duel' | 'challenge';
  onSubmit: (username: string) => Promise<void>;
  onPlayAgain: () => void;
  onRematch?: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  isSubmitted?: boolean;
  scoreId?: string;
}

// Icons
const RefreshIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function EndScreen({
  result,
  duration,
  elapsedTime,
  mode,
  onSubmit,
  onPlayAgain,
  onRematch,
  isSubmitting = false,
  submitError = null,
  isSubmitted = false,
  scoreId
}: EndScreenProps) {
  const [username, setUsername] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const savedUsername = localStorage.getItem('67ranked_lastUsername');
    if (savedUsername) setUsername(savedUsername);
  }, []);

  const is67Reps = is67RepsMode(duration);
  const canSubmitToLeaderboard = mode === 'normal' && 
    (duration === DURATION_6_7S || duration === DURATION_20S || is67Reps);

  const validateUsername = (value: string): boolean => {
    if (!value || value.length < 1) {
      setValidationError('Username is required');
      return false;
    }
    if (value.length > 20) {
      setValidationError('Username must be 20 characters or less');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setValidationError('Only letters, numbers, and underscores');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (validationError) validateUsername(value);
  };

  const handleSubmit = async () => {
    if (validateUsername(username)) {
      localStorage.setItem('67ranked_lastUsername', username);
      await onSubmit(username);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms === DURATION_6_7S) return '6.7s Sprint';
    if (ms === DURATION_20S) return '20s Endurance';
    if (ms === DURATION_67_REPS) return '67 Reps';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatElapsedTime = (ms: number) => (ms / 1000).toFixed(2);

  const handleShare = async () => {
    const shareText = is67Reps
      ? `${username || 'I'} got 67 reps in ${formatElapsedTime(elapsedTime || 0)}s on 67ranked.com. Can you beat that?`
      : `${username || 'I'} scored ${result.myScore} reps on 67ranked.com. Can you beat that?`;
    
    const shareUrl = scoreId 
      ? `${window.location.origin}/score/${scoreId}`
      : window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({ title: '67Ranked', text: shareText, url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Copied to clipboard!');
    }
  };

  // Calculate reps per second for timed modes
  const repsPerSecond = !is67Reps && duration > 0 
    ? (result.myScore / (duration / 1000)).toFixed(1) 
    : null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 z-50 overflow-y-auto">
      <div className="glass-panel rounded-2xl w-full max-w-2xl animate-scale-in">
        {/* Header bar */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-mono text-accent-green uppercase tracking-wider animate-glow">
            Session Complete
          </span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent-green"></span>
            <span className="w-2 h-2 rounded-full bg-accent-green opacity-70"></span>
            <span className="w-2 h-2 rounded-full bg-accent-green opacity-40"></span>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          {/* Main content */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left: Score display */}
            <div className="flex-1">
              {/* Mode badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-green/10 border border-accent-green/30 rounded-full mb-4">
                <svg className="w-4 h-4 text-accent-green" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
                </svg>
                <span className="text-xs font-semibold text-accent-green uppercase tracking-wider">
                  {formatDuration(duration)}
                </span>
              </div>

              {/* Score label */}
              <p className="text-label mb-2">
                {is67Reps ? 'Final Time' : 'Session Score'}
              </p>

              {/* Large score */}
              {is67Reps ? (
                <div className="mb-4">
                  <span className="score-display text-7xl lg:text-8xl text-accent-green">
                    {formatElapsedTime(elapsedTime || 0)}
                  </span>
                  <span className="text-2xl text-white/30 ml-1">s</span>
                </div>
              ) : (
                <div className="mb-4">
                  <span className="score-display text-7xl lg:text-8xl text-white">
                    {result.myScore.toLocaleString()}
                  </span>
                  <span className="text-2xl text-white/30 ml-2">reps</span>
                </div>
              )}

              {/* Submitted badge */}
              {isSubmitted && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-green/10 rounded-lg">
                  <CheckIcon />
                  <span className="text-sm text-accent-green font-medium">Saved to leaderboard</span>
                </div>
              )}
            </div>

            {/* Right: Stats & Actions */}
            <div className="lg:w-72 lg:border-l lg:border-white/5 lg:pl-8">
              {/* Stats grid - only show for non-duel modes */}
              {mode === 'normal' && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {repsPerSecond && (
                    <div className="stat-box">
                      <p className="text-label mb-1">Reps/Sec</p>
                      <p className="text-2xl font-bold text-white">{repsPerSecond}</p>
                    </div>
                  )}
                  <div className="stat-box">
                    <p className="text-label mb-1">Mode</p>
                    <p className="text-lg font-bold text-white truncate">
                      {is67Reps ? '67 Reps' : duration === DURATION_6_7S ? 'Sprint' : 'Endurance'}
                    </p>
                  </div>
                </div>
              )}

              {/* Duel result */}
              {(mode === 'duel' || mode === 'challenge') && result.opponentScore !== undefined && (
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-label">VS {result.opponentUsername}</span>
                    <span className={`text-sm font-bold ${
                      result.outcome === 'win' ? 'text-accent-green' : 
                      result.outcome === 'lose' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {result.outcome === 'win' ? 'WIN' : 
                       result.outcome === 'lose' ? 'LOSS' : 'TIE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/40">You</p>
                      <p className="text-xl font-bold text-white">{result.myScore}</p>
                    </div>
                    <span className="text-white/20">—</span>
                    <div className="text-right">
                      <p className="text-xs text-white/40">{result.opponentUsername}</p>
                      <p className="text-xl font-bold text-white">{result.opponentScore}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Username input */}
              {canSubmitToLeaderboard && !isSubmitted && (
                <div className="mb-4">
                  <label className="text-label block mb-2">Your Name</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="Enter username"
                    maxLength={20}
                    className="w-full rounded-lg px-4 py-3 text-white text-center font-semibold"
                  />
                  {(validationError || submitError) && (
                    <p className="text-red-400 text-xs mt-2">{validationError || submitError}</p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                {canSubmitToLeaderboard && !isSubmitted && (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !username}
                    className={`btn-primary w-full ${(isSubmitting || !username) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Score'}
                  </button>
                )}

                <div className="flex gap-2">
                  <button onClick={onPlayAgain} className="btn-secondary flex-1">
                    <RefreshIcon />
                    Replay
                  </button>
                  <button onClick={handleShare} className="btn-secondary flex-1">
                    <ShareIcon />
                    Share
                  </button>
                </div>

                {onRematch && (
                  <button onClick={onRematch} className="btn-secondary w-full">
                    <RefreshIcon />
                    Rematch
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-white/30 font-mono uppercase tracking-wider">67ranked.com</span>
          <button 
            onClick={onPlayAgain}
            className="text-xs text-white/40 hover:text-white transition-colors uppercase tracking-wider"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
