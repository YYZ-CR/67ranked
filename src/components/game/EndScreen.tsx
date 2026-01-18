'use client';

import { useState } from 'react';
import { GameResult, DURATION_6_7S, DURATION_20S } from '@/types/game';

interface EndScreenProps {
  result: GameResult;
  duration: number;
  mode: 'normal' | 'duel' | 'challenge';
  onSubmit: (username: string) => Promise<void>;
  onPlayAgain: () => void;
  onRematch?: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  isSubmitted?: boolean;
}

export function EndScreen({
  result,
  duration,
  mode,
  onSubmit,
  onPlayAgain,
  onRematch,
  isSubmitting = false,
  submitError = null,
  isSubmitted = false
}: EndScreenProps) {
  const [username, setUsername] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const canSubmitToLeaderboard = mode === 'normal' && 
    (duration === DURATION_6_7S || duration === DURATION_20S);

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
      setValidationError('Only letters, numbers, and underscores allowed');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (validationError) {
      validateUsername(value);
    }
  };

  const handleSubmit = async () => {
    if (validateUsername(username)) {
      await onSubmit(username);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms === DURATION_6_7S) return '6.7s';
    if (ms === DURATION_20S) return '20s';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
      <div className="glass-panel p-6 rounded-2xl max-w-sm w-full mx-4 text-center">
        {/* Score display */}
        <div className="mb-6">
          <p className="text-white/60 text-sm mb-1">Your Score</p>
          <p className="text-6xl font-black text-white mb-2">{result.myScore}</p>
          <p className="text-white/50 text-sm">
            reps in {formatDuration(duration)}
          </p>
        </div>

        {/* VS Result for Duel/Challenge */}
        {(mode === 'duel' || mode === 'challenge') && result.opponentScore !== undefined && (
          <div className="mb-6 py-4 border-t border-b border-white/10">
            <div className={`
              text-3xl font-black mb-3
              ${result.outcome === 'win' ? 'text-accent-green' : 
                result.outcome === 'lose' ? 'text-red-400' : 'text-yellow-400'}
            `}>
              {result.outcome === 'win' ? '🎉 YOU WIN!' : 
               result.outcome === 'lose' ? '😔 YOU LOSE' : '🤝 TIE!'}
            </div>
            <div className="flex justify-center items-center gap-4">
              <div className="text-center">
                <p className="text-white/60 text-xs">You</p>
                <p className="text-2xl font-bold text-white">{result.myScore}</p>
              </div>
              <span className="text-white/40 text-xl">vs</span>
              <div className="text-center">
                <p className="text-white/60 text-xs">{result.opponentUsername}</p>
                <p className="text-2xl font-bold text-white">{result.opponentScore}</p>
              </div>
            </div>
          </div>
        )}

        {/* Username input for leaderboard */}
        {canSubmitToLeaderboard && !isSubmitted && (
          <div className="mb-4">
            <label className="text-white/70 text-sm mb-2 block">
              Enter your name for the leaderboard
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="Username"
              maxLength={20}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center font-semibold placeholder:text-white/30 focus:outline-none focus:border-accent-green"
            />
            {(validationError || submitError) && (
              <p className="text-red-400 text-xs mt-2">
                {validationError || submitError}
              </p>
            )}
          </div>
        )}

        {/* Submitted confirmation */}
        {isSubmitted && (
          <div className="mb-4 py-3 bg-accent-green/20 rounded-xl">
            <p className="text-accent-green font-semibold">
              ✓ Score submitted to leaderboard!
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {canSubmitToLeaderboard && !isSubmitted && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !username}
              className={`
                w-full py-3 rounded-xl font-semibold transition-all
                ${isSubmitting || !username
                  ? 'bg-white/10 text-white/50 cursor-not-allowed'
                  : 'bg-accent-green text-black hover:bg-accent-green/90'
                }
              `}
            >
              {isSubmitting ? 'Saving...' : 'Save Score'}
            </button>
          )}
          
          {onRematch && (
            <button
              onClick={onRematch}
              className="w-full py-3 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-600 transition-all"
            >
              🔄 Rematch
            </button>
          )}
          
          <button
            onClick={onPlayAgain}
            className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
