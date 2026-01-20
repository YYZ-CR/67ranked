'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, is67RepsMode } from '@/types/game';
import { Header } from '@/components/ui/Header';

interface ScoreData {
  id: string;
  username: string;
  score: number;
  duration_ms: number;
  created_at: string;
  dailyRank?: number;
  allTimeRank?: number;
  percentile?: number;
  totalPlayers?: number;
}

// Icons
const PlayIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
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
  </svg>
);

const TargetIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

export default function ScorePage() {
  const params = useParams();
  const scoreId = params.id as string;
  
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const response = await fetch(`/api/score/${scoreId}`);
        if (!response.ok) throw new Error('Score not found');
        const data = await response.json();
        setScoreData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load score');
      } finally {
        setLoading(false);
      }
    };
    fetchScore();
  }, [scoreId]);

  const formatDuration = (ms: number) => {
    if (ms === DURATION_6_7S) return '6.7s Sprint';
    if (ms === DURATION_20S) return '20s Endurance';
    if (ms === DURATION_67_REPS) return '67 Reps';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatScore = (score: number, duration: number) => {
    if (is67RepsMode(duration)) return (score / 1000).toFixed(2);
    return score.toString();
  };

  const getShareText = () => {
    if (!scoreData) return '';
    const is67Reps = is67RepsMode(scoreData.duration_ms);
    if (is67Reps) {
      return `${scoreData.username} got 67 reps in ${(scoreData.score / 1000).toFixed(2)}s on 67ranked.com. Can you beat that?`;
    }
    return `${scoreData.username} scored ${scoreData.score} reps on 67ranked.com. Can you beat that?`;
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = getShareText();

    if (navigator.share) {
      try {
        await navigator.share({ title: '67Ranked', text: shareText, url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    }
  };

  const handleDownload = async () => {
    if (!scoreData) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 2; // High DPI
    const width = 600;
    const height = 440;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Subtle green radial glow at top
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

    // Header section
    const headerY = cardY;
    const headerH = 48;

    // Header bottom border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(cardX, headerY + headerH);
    ctx.lineTo(cardX + cardW, headerY + headerH);
    ctx.stroke();

    // Mode icon - draw appropriate icon based on mode
    const iconX = cardX + 20;
    const iconY = headerY + 14;
    const iconSize = 24;
    
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    
    if (scoreData.duration_ms === DURATION_67_REPS) {
      // Target/crosshair icon for 67 Reps
      const cx = iconX + iconSize / 2;
      const cy = iconY + iconSize / 2;
      // Outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.stroke();
      // Inner circle
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.stroke();
      // Center dot
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (scoreData.duration_ms === DURATION_6_7S) {
      // Bolt icon for 6.7s Sprint
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.moveTo(iconX + 14, iconY + 2);
      ctx.lineTo(iconX + 6, iconY + 12);
      ctx.lineTo(iconX + 11, iconY + 12);
      ctx.lineTo(iconX + 10, iconY + 22);
      ctx.lineTo(iconX + 18, iconY + 10);
      ctx.lineTo(iconX + 13, iconY + 10);
      ctx.lineTo(iconX + 14, iconY + 2);
      ctx.fill();
    } else {
      // Timer icon for 20s Endurance
      const cx = iconX + iconSize / 2;
      const cy = iconY + iconSize / 2 + 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
      // Clock hand
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - 5);
      ctx.lineTo(cx + 3, cy - 2);
      ctx.stroke();
    }

    // Mode label
    ctx.fillStyle = '#4ade80';
    ctx.font = '500 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatDuration(scoreData.duration_ms), iconX + iconSize + 10, headerY + headerH / 2);

    // Date
    const dateStr = new Date(scoreData.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, cardX + cardW - 20, headerY + headerH / 2);

    // Body content
    const bodyY = headerY + headerH + 32;

    // Username (truncate if too long)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const displayUsername = scoreData.username.length > 20 ? scoreData.username.slice(0, 17) + '...' : scoreData.username;
    ctx.fillText(displayUsername, width / 2, bodyY);

    // Score - use italic style
    const scoreStr = formatScore(scoreData.score, scoreData.duration_ms);
    const scoreUnit = is67RepsMode(scoreData.duration_ms) ? 's' : ' reps';
    
    // Draw score with slant transform for italic effect
    ctx.save();
    ctx.fillStyle = '#4ade80';
    ctx.font = '900 88px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    
    // Apply skew transform for italic effect
    const scoreY = bodyY + 85;
    ctx.translate(width / 2, scoreY);
    ctx.transform(1, 0, -0.12, 1, 0, 0); // Skew for italic
    ctx.fillText(scoreStr, 0, 0);
    
    // Measure score width for unit placement
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

    // Rank boxes (Daily, All-Time, Top %)
    if (scoreData.dailyRank && scoreData.allTimeRank && scoreData.percentile) {
      const boxY = bodyY + 115;
      const boxH = 52;
      const boxW = 120;
      const boxGap = 12;
      const totalBoxWidth = boxW * 3 + boxGap * 2;
      const startX = (width - totalBoxWidth) / 2;

      const drawRankBox = (x: number, label: string, value: string, isGreen: boolean = false) => {
        // Box background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '500 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label.toUpperCase(), x + boxW / 2, boxY + 10);

        // Value
        ctx.fillStyle = isGreen ? '#4ade80' : '#fff';
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText(value, x + boxW / 2, boxY + boxH - 8);
      };

      drawRankBox(startX, 'Daily', `#${scoreData.dailyRank}`);
      drawRankBox(startX + boxW + boxGap, 'All-Time', `#${scoreData.allTimeRank}`);
      drawRankBox(startX + (boxW + boxGap) * 2, 'Top', `${scoreData.percentile}%`, true);
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

    // CTA text
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Beat ${scoreData.username}'s Score @ 67ranked.com`, width / 2, ctaY + ctaH / 2);

    // Download
    const link = document.createElement('a');
    link.download = `67ranked-${scoreData.username}-${scoreStr.replace('.', '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial flex items-center justify-center pb-12">
        <div className="flex items-center gap-2 text-white/40">
          <div className="w-4 h-4 border-2 border-white/20 border-t-accent-green rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </main>
    );
  }

  if (error || !scoreData) {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
        <Header />
        <div className="min-h-screen flex items-center justify-center p-4 pt-20 pb-12">
          <div className="glass-panel p-8 rounded-2xl text-center max-w-md animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <TargetIcon />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Score Not Found</h2>
            <p className="text-white/50 mb-6">This score may have been removed or the link is invalid.</p>
            <Link href="/" className="btn-primary w-full">
              <PlayIcon />
              Play 67Ranked
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const is67Reps = is67RepsMode(scoreData.duration_ms);

  const getModeIcon = () => {
    if (scoreData.duration_ms === DURATION_6_7S) return <BoltIcon />;
    if (scoreData.duration_ms === DURATION_20S) return <TimerIcon />;
    if (scoreData.duration_ms === DURATION_67_REPS) return <TargetIcon />;
    return <TimerIcon />;
  };

  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
      <Header />
      
      <div className="min-h-screen flex items-center justify-center p-4 pt-20 pb-12">
        <div className="w-full max-w-lg animate-fade-in">
          {/* Score Card */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getModeIcon()}
                <span className="text-xs text-accent-green font-medium">
                  {formatDuration(scoreData.duration_ms)}
                </span>
              </div>
              <span className="text-xs text-white/30">
                {new Date(scoreData.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>

            {/* Main score display */}
            <div className="p-8 lg:p-10 text-center">
              {/* Username */}
              <p className="text-label mb-2">{scoreData.username}</p>
              
              {/* Score */}
              <div className="mb-4">
                <span className="score-display text-7xl lg:text-8xl text-accent-green">
                  {formatScore(scoreData.score, scoreData.duration_ms)}
                </span>
                <span className="text-2xl text-white/30 ml-2">
                  {is67Reps ? 's' : 'reps'}
                </span>
              </div>

              {/* Rank info */}
              {scoreData.dailyRank && scoreData.allTimeRank && scoreData.percentile && (
                <div className="flex gap-2 justify-center">
                  <div className="flex-1 max-w-[100px] p-2 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Daily</p>
                    <p className="text-sm font-bold text-white">#{scoreData.dailyRank}</p>
                  </div>
                  <div className="flex-1 max-w-[100px] p-2 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">All-Time</p>
                    <p className="text-sm font-bold text-white">#{scoreData.allTimeRank}</p>
                  </div>
                  <div className="flex-1 max-w-[100px] p-2 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Top</p>
                    <p className="text-sm font-bold text-accent-green">{scoreData.percentile}%</p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="divider"></div>

            {/* Actions */}
            <div className="p-6 space-y-3">
              {/* Primary CTA */}
              <Link href="/" className="btn-primary w-full text-lg py-4">
                <PlayIcon />
                Beat {scoreData.username}&apos;s Score
              </Link>

              {/* Download button - own row */}
              <button onClick={handleDownload} className="w-full p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 text-white/70 hover:text-white">
                <DownloadIcon />
                <span className="text-sm font-medium">Download Image</span>
              </button>

              {/* Secondary actions - glass panel style */}
              <div className="flex gap-2">
                <button onClick={handleShare} className="flex-1 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 text-white/70 hover:text-white">
                  <ShareIcon />
                  <span className="text-sm font-medium">Share</span>
                </button>
                <Link href="/" className="flex-1 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 text-white/70 hover:text-white">
                  <HomeIcon />
                  <span className="text-sm font-medium">Home</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-4">
            <p className="text-white/20 text-xs">67ranked.com</p>
          </div>
        </div>
      </div>
    </main>
  );
}
