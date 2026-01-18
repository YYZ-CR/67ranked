'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { is67RepsMode } from '@/types/game';
import { SwordsIcon, CrownIcon, EqualsIcon, HomeIcon } from '@/components/ui/Icons';

interface DuelData {
  id: string;
  duration_ms: number;
  status: string;
}

interface DuelPlayer {
  username: string;
  score: number | null;
}

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
        if (!response.ok) {
          throw new Error('Duel not found');
        }
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

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </main>
    );
  }

  if (error || !duel) {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
        <div className="glass-panel p-6 rounded-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <SwordsIcon size={32} className="text-white/50" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Duel Not Found</h2>
          <p className="text-white/70 mb-4">{error || 'This duel does not exist'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-xl bg-accent-green text-black font-semibold flex items-center justify-center gap-2 w-full"
          >
            <HomeIcon size={18} />
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  const is67Reps = is67RepsMode(duel.duration_ms);
  const formatTime = (ms: number) => (ms / 1000).toFixed(2) + 's';
  const formatDuration = (ms: number) => {
    if (ms === -1) return '67 Reps';
    return (ms / 1000).toFixed(1) + 's';
  };

  const player1 = players[0];
  const player2 = players[1];
  const bothSubmitted = player1?.score !== null && player2?.score !== null;

  // Determine winner
  let winner: string | null = null;
  let outcome: 'player1' | 'player2' | 'tie' | null = null;
  
  if (bothSubmitted && player1 && player2) {
    if (is67Reps) {
      // Lower time wins
      if (player1.score! < player2.score!) {
        winner = player1.username;
        outcome = 'player1';
      } else if (player2.score! < player1.score!) {
        winner = player2.username;
        outcome = 'player2';
      } else {
        outcome = 'tie';
      }
    } else {
      // Higher reps wins
      if (player1.score! > player2.score!) {
        winner = player1.username;
        outcome = 'player1';
      } else if (player2.score! < player1.score!) {
        winner = player2.username;
        outcome = 'player2';
      } else {
        outcome = 'tie';
      }
    }
  }

  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
      <div className="glass-panel p-8 rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <SwordsIcon size={28} className="text-white" />
            <h1 className="text-3xl font-bold text-white">Duel Results</h1>
          </div>
          <p className="text-white/50 text-sm uppercase tracking-wider">{formatDuration(duel.duration_ms)} mode</p>
        </div>

        {/* Winner Banner */}
        {bothSubmitted && (
          <div className={`text-center mb-6 py-3 rounded-xl flex items-center justify-center gap-2 ${
            outcome === 'tie' ? 'bg-yellow-500/20' : 'bg-accent-green/20'
          }`}>
            {outcome === 'tie' ? (
              <EqualsIcon size={24} className="text-yellow-400" />
            ) : (
              <CrownIcon size={24} className="text-accent-green" />
            )}
            <p className={`text-2xl font-black ${
              outcome === 'tie' ? 'text-yellow-400' : 'text-accent-green'
            }`}>
              {outcome === 'tie' ? 'TIE!' : `${winner} WINS!`}
            </p>
          </div>
        )}

        {/* Scores */}
        <div className="flex justify-center gap-6 mb-8">
          {/* Player 1 */}
          <div className={`flex-1 text-center p-4 rounded-xl ${
            outcome === 'player1' ? 'bg-accent-green/20 ring-2 ring-accent-green' : 'bg-white/5'
          }`}>
            <p className="text-white/60 text-sm mb-1 truncate">{player1?.username || 'Player 1'}</p>
            <p className={`text-4xl font-black ${
              outcome === 'player1' ? 'text-accent-green' : 'text-white'
            }`}>
              {player1?.score !== null 
                ? (is67Reps ? formatTime(player1.score!) : player1.score)
                : '—'}
            </p>
            {is67Reps && player1?.score !== null && (
              <p className="text-white/40 text-xs mt-1">67 reps</p>
            )}
            {!is67Reps && player1?.score !== null && (
              <p className="text-white/40 text-xs mt-1">reps</p>
            )}
          </div>

          {/* VS */}
          <div className="flex items-center">
            <span className="text-white/30 text-xl font-bold">VS</span>
          </div>

          {/* Player 2 */}
          <div className={`flex-1 text-center p-4 rounded-xl ${
            outcome === 'player2' ? 'bg-accent-green/20 ring-2 ring-accent-green' : 'bg-white/5'
          }`}>
            <p className="text-white/60 text-sm mb-1 truncate">{player2?.username || 'Player 2'}</p>
            <p className={`text-4xl font-black ${
              outcome === 'player2' ? 'text-accent-green' : 'text-white'
            }`}>
              {player2?.score !== null 
                ? (is67Reps ? formatTime(player2.score!) : player2.score)
                : '—'}
            </p>
            {is67Reps && player2?.score !== null && (
              <p className="text-white/40 text-xs mt-1">67 reps</p>
            )}
            {!is67Reps && player2?.score !== null && (
              <p className="text-white/40 text-xs mt-1">reps</p>
            )}
          </div>
        </div>

        {/* Status */}
        {!bothSubmitted && (
          <div className="text-center mb-6 py-3 bg-white/5 rounded-xl flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white/50">Waiting for both players to finish...</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push('/duel/create')}
            className="w-full py-3 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-600 transition-all flex items-center justify-center gap-2"
          >
            <SwordsIcon size={20} />
            Start Your Own Duel
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <HomeIcon size={18} />
            Back to Home
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-white/30 text-xs">67ranked.vercel.app</p>
        </div>
      </div>
    </main>
  );
}
