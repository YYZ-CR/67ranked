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
  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
      setValidationError('Required');
      return false;
    }
    if (value.length > 20) {
      setValidationError('Max 20 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setValidationError('Letters, numbers, _ only');
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
    if (ms === DURATION_6_7S) return '6.7s';
    if (ms === DURATION_20S) return '20s';
    if (ms === DURATION_67_REPS) return '67 Reps';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatElapsedTime = (ms: number) => (ms / 1000).toFixed(2);

  const handleShare = async () => {
    const shareText = is67Reps
      ? `${username || 'I'} got 67 reps in ${formatElapsedTime(elapsedTime || 0)}s on 67ranked.com`
      : `${username || 'I'} scored ${result.myScore} reps on 67ranked.com`;
    
    const shareUrl = scoreId 
      ? `${window.location.origin}/score/${scoreId}`
      : window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({ title: '67Ranked', text: shareText, url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Copied!');
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm p-1.5 sm:p-2 z-50">
      <div className="glass-panel rounded-lg sm:rounded-xl w-full max-w-xs sm:max-w-sm animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="px-3 py-1.5 sm:px-4 sm:py-2 border-b border-white/5 flex items-center justify-between">
          <span className="text-[9px] sm:text-[10px] font-mono text-accent-green uppercase tracking-wider">
            Complete
          </span>
          <span className="text-[9px] sm:text-[10px] font-mono text-white/30 uppercase">
            {formatDuration(duration)}
          </span>
        </div>

        <div className="p-3 sm:p-4">
          {/* Score display */}
          <div className="text-center mb-3 sm:mb-4">
            {is67Reps ? (
              <>
                <span className="score-display text-4xl sm:text-5xl text-accent-green">
                  {formatElapsedTime(elapsedTime || 0)}
                </span>
                <span className="text-base sm:text-xl text-white/30 ml-1">s</span>
              </>
            ) : (
              <>
                <span className="score-display text-4xl sm:text-5xl text-white">
                  {result.myScore}
                </span>
                <span className="text-sm sm:text-lg text-white/30 ml-1">reps</span>
              </>
            )}
          </div>

          {/* Duel result */}
          {(mode === 'duel' || mode === 'challenge') && result.opponentScore !== undefined && (
            <div className="mb-3 p-2 sm:p-3 rounded-md sm:rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-white/40">vs {result.opponentUsername}</span>
                <span className={`font-bold ${
                  result.outcome === 'win' ? 'text-accent-green' : 
                  result.outcome === 'lose' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {result.outcome === 'win' ? 'WIN' : result.outcome === 'lose' ? 'LOSS' : 'TIE'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1.5 sm:mt-2">
                <span className="text-base sm:text-lg font-bold text-white">{result.myScore}</span>
                <span className="text-white/20">—</span>
                <span className="text-base sm:text-lg font-bold text-white">{result.opponentScore}</span>
              </div>
            </div>
          )}

          {/* Submitted badge */}
          {isSubmitted && (
            <div className="mb-2.5 sm:mb-3 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-2 sm:px-3 bg-accent-green/10 rounded-md sm:rounded-lg">
              <CheckIcon />
              <span className="text-[10px] sm:text-xs text-accent-green font-medium">Saved</span>
            </div>
          )}

          {/* Username input */}
          {canSubmitToLeaderboard && !isSubmitted && (
            <div className="mb-2.5 sm:mb-3">
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="Your name"
                maxLength={20}
                className="w-full rounded-md sm:rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-white text-center text-xs sm:text-sm"
              />
              {(validationError || submitError) && (
                <p className="text-red-400 text-[9px] sm:text-[10px] mt-1 text-center">{validationError || submitError}</p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-1.5 sm:space-y-2">
            {canSubmitToLeaderboard && !isSubmitted && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !username}
                className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-md sm:rounded-lg font-semibold text-xs sm:text-sm bg-accent-green text-black transition-all ${
                  (isSubmitting || !username) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent-green-dark'
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Save Score'}
              </button>
            )}

            <div className="flex gap-1.5 sm:gap-2">
              <button 
                onClick={onPlayAgain} 
                className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-medium text-white/70 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-1 sm:gap-1.5"
              >
                <RefreshIcon />
                Again
              </button>
              <button 
                onClick={handleShare} 
                className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-medium text-white/70 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-1 sm:gap-1.5"
              >
                <ShareIcon />
                Share
              </button>
            </div>

            {onRematch && (
              <button 
                onClick={onRematch} 
                className="w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-medium text-white/70 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-1 sm:gap-1.5"
              >
                <RefreshIcon />
                Rematch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
