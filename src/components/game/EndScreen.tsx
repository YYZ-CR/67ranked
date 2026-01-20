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
  dailyRank?: number;
  allTimeRank?: number;
  percentile?: number;
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

const DownloadIcon = () => (
  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
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
  scoreId,
  dailyRank,
  allTimeRank,
  percentile
}: EndScreenProps) {
  const [username, setUsername] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

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
    // For normal mode with leaderboard, require saving first
    if (canSubmitToLeaderboard && !isSubmitted) {
      setShareError('Save your score before sharing');
      setTimeout(() => setShareError(null), 3000);
      return;
    }

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

  const handleDownload = async () => {
    if (!isSubmitted || !username) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 2;
    const width = 600;
    const height = 440;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Subtle green radial glow
    const gradient = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, 300);
    gradient.addColorStop(0, 'rgba(74, 222, 128, 0.08)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Card dimensions
    const cardX = 32;
    const cardY = 20;
    const cardW = width - 64;
    const cardH = 400;
    const radius = 16;

    // Card background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fill();

    // Card border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Header
    const headerY = cardY;
    const headerH = 48;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(cardX, headerY + headerH);
    ctx.lineTo(cardX + cardW, headerY + headerH);
    ctx.stroke();

    // Mode label
    const modeLabel = duration === DURATION_6_7S ? '6.7s Sprint' 
      : duration === DURATION_20S ? '20s Endurance'
      : duration === DURATION_67_REPS ? '67 Reps' : '';
    ctx.fillStyle = '#4ade80';
    ctx.font = '500 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(modeLabel, cardX + 20, headerY + headerH / 2);

    // Body
    const bodyY = headerY + headerH + 32;

    // Username
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const displayUsername = username.length > 20 ? username.slice(0, 17) + '...' : username;
    ctx.fillText(displayUsername, width / 2, bodyY);

    // Score
    const scoreStr = is67Reps ? ((elapsedTime || 0) / 1000).toFixed(2) : result.myScore.toString();
    const scoreUnit = is67Reps ? 's' : ' reps';
    
    ctx.save();
    ctx.fillStyle = '#4ade80';
    ctx.font = '900 88px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const scoreY = bodyY + 85;
    ctx.translate(width / 2, scoreY);
    ctx.transform(1, 0, -0.12, 1, 0, 0);
    ctx.fillText(scoreStr, 0, 0);
    const scoreWidth = ctx.measureText(scoreStr).width;
    ctx.restore();

    // Score unit
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '400 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.translate(width / 2 + scoreWidth / 2 + 4, scoreY);
    ctx.transform(1, 0, -0.12, 1, 0, 0);
    ctx.fillText(scoreUnit, 0, 0);
    ctx.restore();

    // Rank boxes
    if (dailyRank && allTimeRank && percentile) {
      const boxY = bodyY + 115;
      const boxH = 52;
      const boxW = 120;
      const boxGap = 12;
      const totalBoxWidth = boxW * 3 + boxGap * 2;
      const startX = (width - totalBoxWidth) / 2;

      const drawRankBox = (x: number, label: string, value: string, isGreen: boolean = false) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '500 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label.toUpperCase(), x + boxW / 2, boxY + 10);

        ctx.fillStyle = isGreen ? '#4ade80' : '#fff';
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText(value, x + boxW / 2, boxY + boxH - 8);
      };

      drawRankBox(startX, 'Daily', `#${dailyRank}`);
      drawRankBox(startX + boxW + boxGap, 'All-Time', `#${allTimeRank}`);
      drawRankBox(startX + (boxW + boxGap) * 2, 'Top', `${percentile}%`, true);
    }

    // CTA Button
    const ctaY = cardY + cardH - 70;
    const ctaH = 50;
    const ctaX = cardX + 20;
    const ctaW = cardW - 40;

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 12);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Beat ${username}'s Score @ 67ranked.com`, width / 2, ctaY + ctaH / 2);

    // Download
    const link = document.createElement('a');
    link.download = `67ranked-${username}-${scoreStr.replace('.', '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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

          {/* Submitted badge with stats */}
          {isSubmitted && (
            <div className="mb-2.5 sm:mb-3 space-y-2">
              <div className="flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-2 sm:px-3 bg-accent-green/10 rounded-md sm:rounded-lg border border-accent-green/30">
                <CheckIcon />
                <span className="text-[10px] sm:text-xs text-accent-green font-medium">Saved</span>
              </div>
              
              {/* Rank and Percentile */}
              {dailyRank && allTimeRank && percentile && (
                <div className="flex gap-2">
                  <div className="flex-1 p-2 bg-white/5 rounded-md border border-white/10">
                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Daily</p>
                    <p className="text-sm sm:text-base font-bold text-white">#{dailyRank}</p>
                  </div>
                  <div className="flex-1 p-2 bg-white/5 rounded-md border border-white/10">
                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">All-Time</p>
                    <p className="text-sm sm:text-base font-bold text-white">#{allTimeRank}</p>
                  </div>
                  <div className="flex-1 p-2 bg-white/5 rounded-md border border-white/10">
                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Top</p>
                    <p className="text-sm sm:text-base font-bold text-accent-green">{percentile}%</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Download button - own row after rank info */}
          {isSubmitted && (
            <button 
              onClick={handleDownload} 
              className="w-full mb-2.5 sm:mb-3 p-2 bg-white/5 rounded-md border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <DownloadIcon />
              <span className="text-[10px] sm:text-xs font-medium text-white/70">Download Image</span>
            </button>
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
                className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-1 sm:gap-1.5"
              >
                <RefreshIcon />
                Again
              </button>
              <button 
                onClick={handleShare} 
                className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-1 sm:gap-1.5"
              >
                <ShareIcon />
                Share
              </button>
            </div>

            {/* Share error message */}
            {shareError && (
              <p className="text-yellow-400 text-[9px] sm:text-[10px] text-center">{shareError}</p>
            )}

            {onRematch && (
              <button 
                onClick={onRematch} 
                className="w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-1 sm:gap-1.5"
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
