'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { is67RepsMode, DURATION_6_7S, DURATION_20S, DURATION_67_REPS } from '@/types/game';
import { Header } from '@/components/ui/Header';

interface DuelData {
  id: string;
  duration_ms: number;
  status: string;
  created_at: string;
}

interface DuelPlayer {
  username: string;
  score: number | null;
  rankStats?: { dailyRank: number; allTimeRank: number; percentile: number } | null;
}

// Icons
const SwordsIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5M14.5 17.5l5 5m-5-5l5-5m-9.5 9.5l5 5m-5-5l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
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

export default function DuelResultsPage() {
  const params = useParams();
  const router = useRouter();
  const duelId = params.duelId as string;

  const [duel, setDuel] = useState<DuelData | null>(null);
  const [players, setPlayers] = useState<DuelPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDuel = async () => {
      try {
        const response = await fetch(`/api/duel/${duelId}`);
        if (!response.ok) throw new Error('Duel not found');
        const data = await response.json();
        setDuel(data.duel);
        setPlayers(data.players);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load duel');
      } finally {
        setLoading(false);
      }
    };
    loadDuel();
  }, [duelId]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/duel/${duelId}/results`;
    const shareText = `Check out this duel on 67ranked.com!`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: '67Ranked Duel', text: shareText, url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    }
  };

  const formatTime = (ms: number) => (ms / 1000).toFixed(2);
  const formatDuration = (ms: number) => {
    if (ms === DURATION_6_7S) return '6.7s Sprint';
    if (ms === DURATION_20S) return '20s Endurance';
    if (ms === DURATION_67_REPS) return '67 Reps';
    return (ms / 1000).toFixed(1) + 's';
  };

  const getModeIcon = (duration: number) => {
    if (duration === DURATION_6_7S) return <BoltIcon />;
    if (duration === DURATION_20S) return <TimerIcon />;
    if (duration === DURATION_67_REPS) return <TargetIcon />;
    return <TimerIcon />;
  };

  const handleDownload = async () => {
    if (!duel || players.length < 2) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 2;
    const width = 600;
    const height = 420;
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
    const cardH = 380;
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
    const headerH = 48;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(cardX, cardY + headerH);
    ctx.lineTo(cardX + cardW, cardY + headerH);
    ctx.stroke();

    // Mode icon
    const iconX = cardX + 20;
    const iconY = cardY + 14;
    const iconSize = 24;
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    
    if (duel.duration_ms === DURATION_67_REPS) {
      const cx = iconX + iconSize / 2;
      const cy = iconY + iconSize / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (duel.duration_ms === DURATION_6_7S) {
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
      const cx = iconX + iconSize / 2;
      const cy = iconY + iconSize / 2 + 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
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
    ctx.fillText(formatDuration(duel.duration_ms), iconX + iconSize + 10, cardY + headerH / 2);

    // Date
    const dateStr = new Date(duel.created_at || Date.now()).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, cardX + cardW - 20, cardY + headerH / 2);

    const is67Reps = is67RepsMode(duel.duration_ms);
    const player1 = players[0];
    const player2 = players[1];
    
    let outcome: 'player1' | 'player2' | 'tie' | null = null;
    if (player1?.score !== null && player2?.score !== null) {
      if (is67Reps) {
        if (player1.score! < player2.score!) outcome = 'player1';
        else if (player2.score! < player1.score!) outcome = 'player2';
        else outcome = 'tie';
      } else {
        if (player1.score! > player2.score!) outcome = 'player1';
        else if (player2.score! > player1.score!) outcome = 'player2';
        else outcome = 'tie';
      }
    }

    // Player cards - properly centered
    const vsGap = 36; // Gap for VS text
    const playerCardW = 210;
    const playerCardH = 170;
    const totalPlayerWidth = playerCardW * 2 + vsGap;
    const playerStartX = (width - totalPlayerWidth) / 2;
    const playerCardY = cardY + headerH + 24;

    // Draw player card function
    const drawPlayerCard = (x: number, player: DuelPlayer, isWinner: boolean, isLoser: boolean) => {
      // Card bg
      if (isWinner) {
        ctx.fillStyle = 'rgba(74, 222, 128, 0.05)';
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)';
      } else if (isLoser) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      }
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, playerCardY, playerCardW, playerCardH, 12);
      ctx.fill();
      ctx.stroke();

      const centerX = x + playerCardW / 2;
      const hasLabel = isWinner || isLoser;

      // Winner/Loser badge
      if (isWinner) {
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('WINNER', centerX, playerCardY + 24);
      } else if (isLoser) {
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LOSER', centerX, playerCardY + 24);
      }

      // Username
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.username, centerX, playerCardY + (hasLabel ? 48 : 40));

      // Score
      if (player.score !== null) {
        const scoreStr = is67Reps ? formatTime(player.score) : player.score.toString();
        
        ctx.save();
        ctx.fillStyle = isWinner ? '#4ade80' : isLoser ? '#f87171' : '#fff';
        ctx.font = '900 48px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.translate(centerX, playerCardY + (hasLabel ? 100 : 92));
        ctx.transform(1, 0, -0.12, 1, 0, 0);
        ctx.fillText(scoreStr, 0, 0);
        ctx.restore();

        // Unit
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(is67Reps ? 'seconds' : 'reps', centerX, playerCardY + (hasLabel ? 130 : 122));
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '900 48px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('—', centerX, playerCardY + 92);
      }
    };

    // Player 1
    drawPlayerCard(playerStartX, player1, outcome === 'player1', outcome === 'player2');

    // VS
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', width / 2, playerCardY + playerCardH / 2);

    // Player 2
    drawPlayerCard(playerStartX + playerCardW + vsGap, player2, outcome === 'player2', outcome === 'player1');

    // Tie indicator
    if (outcome === 'tie') {
      ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
      ctx.beginPath();
      ctx.roundRect(playerStartX, playerCardY + playerCardH + 16, totalPlayerWidth, 36, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DRAW', width / 2, playerCardY + playerCardH + 34);
    }

    // CTA Button
    const ctaY = cardY + cardH - 60;
    const ctaH = 44;
    const ctaX = cardX + 20;
    const ctaW = cardW - 40;

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 10);
    ctx.fill();

    const ctaText = 'Create Your Own Duel @ 67ranked.com';

    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaText, width / 2, ctaY + ctaH / 2);

    // Download
    const link = document.createElement('a');
    link.download = `67ranked-duel-${player1.username}-vs-${player2.username}.png`;
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

  if (error || !duel) {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
        <Header />
        <div className="min-h-screen flex items-center justify-center p-4 pt-20 pb-12">
          <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <SwordsIcon />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Duel Not Found</h2>
            <p className="text-white/50 mb-6">{error || 'This duel does not exist'}</p>
            <button onClick={() => router.push('/')} className="btn-primary w-full">
              <HomeIcon />
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  const is67Reps = is67RepsMode(duel.duration_ms);
  const player1 = players[0];
  const player2 = players[1];
  const bothSubmitted = player1?.score !== null && player2?.score !== null;

  // Determine winner
  let outcome: 'player1' | 'player2' | 'tie' | null = null;
  
  if (bothSubmitted && player1 && player2) {
    if (is67Reps) {
      if (player1.score! < player2.score!) outcome = 'player1';
      else if (player2.score! < player1.score!) outcome = 'player2';
      else outcome = 'tie';
    } else {
      if (player1.score! > player2.score!) outcome = 'player1';
      else if (player2.score! > player1.score!) outcome = 'player2';
      else outcome = 'tie';
    }
  }

  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
      <Header />
      
      <div className="min-h-screen flex items-center justify-center p-4 pt-20 pb-12">
        <div className="w-full max-w-lg animate-fade-in">
          {/* Score Card */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            {/* Header - matches solo style */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getModeIcon(duel.duration_ms)}
                <span className="text-xs text-accent-green font-medium">
                  {formatDuration(duel.duration_ms)}
                </span>
              </div>
              <span className="text-xs text-white/30">
                {new Date(duel.created_at || Date.now()).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>

            {/* Scores */}
            <div className="p-6 lg:p-8">
              <div className="flex items-stretch gap-4 lg:gap-6">
                {/* Player 1 */}
                <div className={`flex-1 text-center p-5 lg:p-6 rounded-xl transition-all ${
                  outcome === 'player1' 
                    ? 'card-selected' 
                    : outcome === 'player2'
                    ? 'bg-red-500/5 border border-red-500/30'
                    : 'card'
                }`}>
                  {outcome === 'player1' && (
                    <div className="text-accent-green text-xs font-bold uppercase tracking-wider mb-2">Winner</div>
                  )}
                  {outcome === 'player2' && (
                    <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">Loser</div>
                  )}
                  <p className="text-white/50 text-sm mb-2 truncate">{player1?.username || 'Player 1'}</p>
                  <p className={`text-5xl lg:text-6xl font-black tabular-nums ${
                    outcome === 'player1' ? 'text-accent-green' : outcome === 'player2' ? 'text-red-400' : 'text-white'
                  }`} style={{ fontStyle: 'italic' }}>
                    {player1?.score !== null 
                      ? (is67Reps ? formatTime(player1.score!) : player1.score)
                      : '—'}
                  </p>
                  {player1?.score !== null && (
                    <p className="text-white/30 text-xs mt-2">{is67Reps ? 'seconds' : 'reps'}</p>
                  )}
                </div>

                {/* VS Divider */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
                  <span className="text-white/20 text-sm font-bold my-2">VS</span>
                  <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
                </div>

                {/* Player 2 */}
                <div className={`flex-1 text-center p-5 lg:p-6 rounded-xl transition-all ${
                  outcome === 'player2' 
                    ? 'card-selected' 
                    : outcome === 'player1'
                    ? 'bg-red-500/5 border border-red-500/30'
                    : 'card'
                }`}>
                  {outcome === 'player2' && (
                    <div className="text-accent-green text-xs font-bold uppercase tracking-wider mb-2">Winner</div>
                  )}
                  {outcome === 'player1' && (
                    <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">Loser</div>
                  )}
                  <p className="text-white/50 text-sm mb-2 truncate">{player2?.username || 'Player 2'}</p>
                  <p className={`text-5xl lg:text-6xl font-black tabular-nums ${
                    outcome === 'player2' ? 'text-accent-green' : outcome === 'player1' ? 'text-red-400' : 'text-white'
                  }`} style={{ fontStyle: 'italic' }}>
                    {player2?.score !== null 
                      ? (is67Reps ? formatTime(player2.score!) : player2.score)
                      : '—'}
                  </p>
                  {player2?.score !== null && (
                    <p className="text-white/30 text-xs mt-2">{is67Reps ? 'seconds' : 'reps'}</p>
                  )}
                </div>
              </div>

              {/* Rank Stats (if available and it's a standard mode) */}
              {bothSubmitted && (player1?.rankStats || player2?.rankStats) && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {/* Player 1 Stats */}
                  {player1?.rankStats && (
                    <div className="space-y-2">
                      <p className="text-white/40 text-xs text-center truncate">{player1.username}&apos;s Rank</p>
                      <div className="grid grid-cols-3 gap-1">
                        <div className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
                          <p className="text-white/40 text-[9px]">Daily</p>
                          <p className="text-white font-bold text-xs">#{player1.rankStats.dailyRank}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
                          <p className="text-white/40 text-[9px]">All-Time</p>
                          <p className="text-white font-bold text-xs">#{player1.rankStats.allTimeRank}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
                          <p className="text-white/40 text-[9px]">Top</p>
                          <p className="text-accent-green font-bold text-xs">{player1.rankStats.percentile}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Player 2 Stats */}
                  {player2?.rankStats && (
                    <div className="space-y-2">
                      <p className="text-white/40 text-xs text-center truncate">{player2.username}&apos;s Rank</p>
                      <div className="grid grid-cols-3 gap-1">
                        <div className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
                          <p className="text-white/40 text-[9px]">Daily</p>
                          <p className="text-white font-bold text-xs">#{player2.rankStats.dailyRank}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
                          <p className="text-white/40 text-[9px]">All-Time</p>
                          <p className="text-white font-bold text-xs">#{player2.rankStats.allTimeRank}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
                          <p className="text-white/40 text-[9px]">Top</p>
                          <p className="text-accent-green font-bold text-xs">{player2.rankStats.percentile}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tie indicator */}
              {outcome === 'tie' && (
                <div className="mt-6 text-center py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <p className="text-yellow-400 font-bold uppercase tracking-wider">Draw</p>
                </div>
              )}

              {/* Waiting indicator */}
              {!bothSubmitted && (
                <div className="mt-6 text-center py-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-accent-green rounded-full animate-spin" />
                  <p className="text-white/40 text-sm">Waiting for both players to finish...</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="divider"></div>

            {/* Actions */}
            <div className="p-6 space-y-3">
              {/* Primary CTA */}
              <button onClick={() => router.push('/duel/create')} className="btn-primary w-full text-lg py-4">
                <SwordsIcon />
                New Duel
              </button>

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
                <button onClick={() => router.push('/')} className="flex-1 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 text-white/70 hover:text-white">
                  <HomeIcon />
                  <span className="text-sm font-medium">Home</span>
                </button>
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
