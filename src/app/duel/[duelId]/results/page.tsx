'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { is67RepsMode } from '@/types/game';
import { Header } from '@/components/ui/Header';

interface DuelData {
  id: string;
  duration_ms: number;
  status: string;
}

interface DuelPlayer {
  username: string;
  score: number | null;
}

// Icons
const SwordsIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
      alert('Copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial flex items-center justify-center">
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
        <div className="min-h-screen flex items-center justify-center p-4 pt-20">
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
  const formatTime = (ms: number) => (ms / 1000).toFixed(2);
  const formatDuration = (ms: number) => {
    if (ms === -1) return '67 Reps';
    return (ms / 1000).toFixed(1) + 's';
  };

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
      
      <div className="min-h-screen flex items-center justify-center p-4 pt-20">
        <div className="glass-panel rounded-2xl w-full max-w-xl animate-fade-in">
          {/* Header */}
          <div className="p-5 border-b border-white/5">
            <h1 className="text-xl font-bold text-white">Duel Results</h1>
            <p className="text-xs text-white/40 mt-1">{formatDuration(duel.duration_ms)} mode</p>
          </div>

          {/* Scores */}
          <div className="p-6 lg:p-8">
            <div className="flex items-stretch gap-4 lg:gap-6">
              {/* Player 1 */}
              <div className={`flex-1 text-center p-5 lg:p-6 rounded-xl transition-all ${
                outcome === 'player1' 
                  ? 'card-selected' 
                  : 'card'
              }`}>
                {outcome === 'player1' && (
                  <div className="text-accent-green text-xs font-bold uppercase tracking-wider mb-2">Winner</div>
                )}
                <p className="text-white/50 text-sm mb-2 truncate">{player1?.username || 'Player 1'}</p>
                <p className={`text-5xl lg:text-6xl font-black tabular-nums ${
                  outcome === 'player1' ? 'text-accent-green' : 'text-white'
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
                  : 'card'
              }`}>
                {outcome === 'player2' && (
                  <div className="text-accent-green text-xs font-bold uppercase tracking-wider mb-2">Winner</div>
                )}
                <p className="text-white/50 text-sm mb-2 truncate">{player2?.username || 'Player 2'}</p>
                <p className={`text-5xl lg:text-6xl font-black tabular-nums ${
                  outcome === 'player2' ? 'text-accent-green' : 'text-white'
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

          {/* Actions */}
          <div className="p-6 lg:p-8 pt-0 space-y-2">
            <div className="flex gap-2">
              <button onClick={handleShare} className="btn-secondary flex-1">
                <ShareIcon />
                Share
              </button>
              <button onClick={() => router.push('/duel/create')} className="btn-primary flex-1">
                <SwordsIcon />
                New Duel
              </button>
            </div>
            <button onClick={() => router.push('/')} className="btn-secondary w-full">
              <HomeIcon />
              Back to Home
            </button>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/5 text-center">
            <p className="text-white/20 text-xs">67ranked.com</p>
          </div>
        </div>
      </div>
    </main>
  );
}
