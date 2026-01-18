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
      setValidationError('Only letters, numbers, and underscores allowed');
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
    if (ms === DURATION_6_7S) return '6.7S SPRINT';
    if (ms === DURATION_20S) return '20S ENDURANCE';
    if (ms === DURATION_67_REPS) return '67 REPS';
    return `${(ms / 1000).toFixed(1)}S`;
  };

  const formatElapsedTime = (ms: number) => (ms / 1000).toFixed(2);

  // Calculate reps per second for stats
  const repsPerSec = is67Reps 
    ? (67 / ((elapsedTime || 1) / 1000)).toFixed(1)
    : (result.myScore / (duration / 1000)).toFixed(1);

  const handleShare = async () => {
    const shareText = is67Reps
      ? `${username || 'Someone'} got 67 reps in ${formatElapsedTime(elapsedTime || 0)}s on 67ranked.com. Can you beat their score?`
      : `${username || 'Someone'} scored ${result.myScore} reps on 67ranked.com. Can you beat their score?`;
    
    const shareUrl = scoreId 
      ? `${window.location.origin}/score/${scoreId}`
      : window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({ title: '67Ranked Score', text: shareText, url: shareUrl });
      } catch { /* User cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Score copied to clipboard!');
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="bg-bg-secondary border border-white/10 rounded-2xl max-w-lg w-full mx-4 overflow-hidden animate-scale-in">
        {/* Header Banner */}
        <div className="bg-accent-green/10 border-b border-accent-green/30 px-6 py-3 flex items-center justify-between">
          <span className="text-accent-green text-sm font-semibold tracking-wider">
            SESSION COMPLETE
          </span>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-white/30"></span>
            <span className="w-2 h-2 rounded-full bg-accent-green"></span>
          </div>
        </div>

        <div className="p-6">
          {/* Duel Result Header */}
          {(mode === 'duel' || mode === 'challenge') && result.opponentScore !== undefined && (
            <div className="mb-6 text-center">
              <p className={`text-sm font-semibold tracking-wider mb-2 ${
                result.outcome === 'win' ? 'text-accent-green' : 
                result.outcome === 'lose' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {result.outcome === 'win' ? 'VICTORY' : result.outcome === 'lose' ? 'DEFEAT' : 'TIE'}
              </p>
              <div className="flex justify-center items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-black text-white">{result.myScore}</p>
                  <p className="text-white/50 text-xs uppercase tracking-wider">You</p>
                </div>
                <span className="text-white/20 text-2xl font-light">—</span>
                <div className="text-center">
                  <p className="text-3xl font-black text-white">{result.opponentScore}</p>
                  <p className="text-white/50 text-xs uppercase tracking-wider">{result.opponentUsername}</p>
                </div>
              </div>
            </div>
          )}

          {/* Solo Mode Layout */}
          {mode === 'normal' && (
            <div className="flex gap-6 mb-6">
              {/* Left Side - Score */}
              <div className="flex-1">
                {/* Mode Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-green/20 rounded-lg mb-4">
                  <svg className="w-4 h-4 text-accent-green" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/>
                  </svg>
                  <span className="text-accent-green text-xs font-semibold tracking-wider">
                    {formatDuration(duration)}
                  </span>
                </div>

                <p className="text-white/50 text-sm uppercase tracking-wider mb-1">
                  {is67Reps ? 'TIME' : 'SESSION SCORE'}
                </p>
                
                {is67Reps ? (
                  <p className="text-6xl font-black text-white leading-none">
                    {formatElapsedTime(elapsedTime || 0)}
                    <span className="text-2xl text-white/50 ml-1">s</span>
                  </p>
                ) : (
                  <p className="text-6xl font-black text-white leading-none">
                    {result.myScore.toLocaleString()}
                    <span className="text-lg text-white/30 align-top">,</span>
                  </p>
                )}
              </div>

              {/* Right Side - Stats */}
              <div className="w-44">
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">GLOBAL RANK</p>
                <p className="text-3xl font-black text-accent-green mb-1">
                  #{Math.floor(Math.random() * 500) + 1}
                  <span className="text-sm text-white/30 font-normal ml-1">/ 12.8k</span>
                </p>
                <span className="inline-block px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs font-semibold rounded">
                  Top {(Math.random() * 10).toFixed(1)}%
                </span>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                    <p className="text-white/40 text-xs uppercase tracking-wider">REPS/SEC</p>
                    <p className="text-lg font-bold text-white">{repsPerSec}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                    <p className="text-white/40 text-xs uppercase tracking-wider">MODE</p>
                    <p className="text-lg font-bold text-white">{is67Reps ? '67R' : duration === DURATION_6_7S ? '6.7' : '20'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Username Input */}
          {canSubmitToLeaderboard && !isSubmitted && (
            <div className="mb-4 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-accent-green"></span>
                <span className="text-white/50 text-xs uppercase tracking-wider">OPERATOR ID</span>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="ENTER YOUR NAME"
                maxLength={20}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white font-mono placeholder:text-white/20 focus:border-accent-green transition-colors"
              />
              {(validationError || submitError) && (
                <p className="text-red-400 text-xs mt-2">{validationError || submitError}</p>
              )}
            </div>
          )}

          {/* Submitted Confirmation */}
          {isSubmitted && (
            <div className="mb-4 py-3 px-4 bg-accent-green/10 border border-accent-green/30 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-accent-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="text-accent-green text-sm font-semibold">SAVED TO LEADERBOARD</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onPlayAgain}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              REPLAY
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              SHARE
            </button>
          </div>

          {onRematch && (
            <button
              onClick={onRematch}
              className="w-full mt-3 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 font-semibold hover:bg-purple-500/30 transition-all"
            >
              REMATCH
            </button>
          )}

          {canSubmitToLeaderboard && !isSubmitted && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !username}
              className={`
                w-full mt-3 py-4 rounded-xl font-bold tracking-wide transition-all flex items-center justify-center gap-2
                ${isSubmitting || !username
                  ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                  : 'bg-accent-green text-black hover:bg-accent-green/90'
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0110 10" />
                  </svg>
                  SAVING...
                </>
              ) : (
                'SAVE SCORE'
              )}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-white/20 text-xs">
          <span>67RANKED.COM</span>
          <span>SESSION #{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
