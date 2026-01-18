'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { is67RepsMode } from '@/types/game';

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
        <div className="flex items-center gap-3 text-white/30">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0110 10" />
          </svg>
          <span className="text-sm tracking-wider">LOADING DUEL DATA...</span>
        </div>
      </main>
    );
  }

  if (error || !duel) {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
        <div className="bg-bg-secondary border border-white/10 p-8 rounded-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">DUEL NOT FOUND</h2>
          <p className="text-white/50 mb-6 text-sm">{error || 'This duel does not exist'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 rounded-xl bg-accent-green text-black font-bold hover:bg-accent-green/90 transition-all flex items-center justify-center gap-2 w-full"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
            BACK TO HOME
          </button>
        </div>
      </main>
    );
  }

  const is67Reps = is67RepsMode(duel.duration_ms);
  const formatTime = (ms: number) => (ms / 1000).toFixed(2);
  const formatDuration = (ms: number) => {
    if (ms === -1) return '67 REPS';
    return (ms / 1000).toFixed(1) + 'S';
  };

  const player1 = players[0];
  const player2 = players[1];
  const bothSubmitted = player1?.score !== null && player2?.score !== null;

  let winner: string | null = null;
  let outcome: 'player1' | 'player2' | 'tie' | null = null;
  
  if (bothSubmitted && player1 && player2) {
    if (is67Reps) {
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
      if (player1.score! > player2.score!) {
        winner = player1.username;
        outcome = 'player1';
      } else if (player2.score! > player1.score!) {
        winner = player2.username;
        outcome = 'player2';
      } else {
        outcome = 'tie';
      }
    }
  }

  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">DUEL RESULTS</h1>
            <p className="text-white/30 text-xs tracking-wider">{formatDuration(duel.duration_ms)} MODE</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
              bothSubmitted ? 'bg-accent-green/20 text-accent-green' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${bothSubmitted ? 'bg-accent-green' : 'bg-yellow-400 animate-pulse'}`}></span>
              {bothSubmitted ? 'COMPLETE' : 'IN PROGRESS'}
            </span>
          </div>
        </div>

        <div className="p-6">
          {/* Winner Banner */}
          {bothSubmitted && (
            <div className={`text-center mb-6 py-4 rounded-xl border ${
              outcome === 'tie' 
                ? 'bg-yellow-500/10 border-yellow-500/30' 
                : 'bg-accent-green/10 border-accent-green/30'
            }`}>
              <p className={`text-3xl font-black tracking-wide ${
                outcome === 'tie' ? 'text-yellow-400' : 'text-accent-green'
              }`}>
                {outcome === 'tie' ? 'TIE GAME' : `${winner?.toUpperCase()} WINS`}
              </p>
            </div>
          )}

          {/* Scores */}
          <div className="flex gap-4 mb-6">
            {/* Player 1 */}
            <div className={`flex-1 p-4 rounded-xl border transition-all ${
              outcome === 'player1' 
                ? 'bg-accent-green/10 border-accent-green' 
                : 'bg-white/5 border-white/10'
            }`}>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2 truncate">
                {player1?.username || 'PLAYER 1'}
              </p>
              <p className={`text-4xl font-black font-mono ${
                outcome === 'player1' ? 'text-accent-green' : 'text-white'
              }`}>
                {player1?.score !== null 
                  ? (is67Reps ? formatTime(player1.score!) : player1.score)
                  : '—'}
              </p>
              <p className="text-white/30 text-xs mt-1">
                {is67Reps ? 'seconds' : 'reps'}
              </p>
            </div>

            {/* VS Divider */}
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-white/30 text-xs font-bold">VS</span>
              </div>
            </div>

            {/* Player 2 */}
            <div className={`flex-1 p-4 rounded-xl border transition-all ${
              outcome === 'player2' 
                ? 'bg-accent-green/10 border-accent-green' 
                : 'bg-white/5 border-white/10'
            }`}>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2 truncate">
                {player2?.username || 'PLAYER 2'}
              </p>
              <p className={`text-4xl font-black font-mono ${
                outcome === 'player2' ? 'text-accent-green' : 'text-white'
              }`}>
                {player2?.score !== null 
                  ? (is67Reps ? formatTime(player2.score!) : player2.score)
                  : '—'}
              </p>
              <p className="text-white/30 text-xs mt-1">
                {is67Reps ? 'seconds' : 'reps'}
              </p>
            </div>
          </div>

          {/* Waiting Status */}
          {!bothSubmitted && (
            <div className="text-center mb-6 py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-white/30 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0110 10" />
              </svg>
              <p className="text-white/50 text-sm">Waiting for both players...</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push('/duel/create')}
              className="w-full py-4 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              CREATE NEW DUEL
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold hover:bg-white/10 transition-all"
            >
              BACK TO HOME
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-white/20 text-xs">
          <span>DUEL #{duelId.slice(0, 8).toUpperCase()}</span>
          <span>67RANKED.COM</span>
        </div>
      </div>
    </main>
  );
}
