import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { is67RepsMode, DURATION_6_7S, DURATION_20S, DURATION_67_REPS } from '@/types/game';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const duelId = searchParams.get('id');

    if (!duelId) {
      return new Response('Missing duel ID', { status: 400 });
    }

    const supabase = createServerClient();
    
    // Fetch duel data
    const { data: duel } = await supabase
      .from('duels')
      .select('duration_ms, status, created_at')
      .eq('id', duelId)
      .single();
    
    // Fetch players
    const { data: players } = await supabase
      .from('duel_players')
      .select('username, score')
      .eq('duel_id', duelId)
      .order('id', { ascending: true });

    if (!duel || !players || players.length < 2) {
      throw new Error('Duel not found');
    }

    const is67Reps = is67RepsMode(duel.duration_ms);
    const player1 = players[0];
    const player2 = players[1];
    
    const formatTime = (ms: number) => (ms / 1000).toFixed(2);
    const modeLabel = duel.duration_ms === DURATION_6_7S ? '6.7s Sprint' 
      : duel.duration_ms === DURATION_20S ? '20s Endurance'
      : duel.duration_ms === DURATION_67_REPS ? '67 Reps'
      : `${(duel.duration_ms / 1000).toFixed(1)}s`;

    // Determine winner
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

    const dateStr = new Date(duel.created_at || Date.now()).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            backgroundImage: 'radial-gradient(ellipse at center top, rgba(74, 222, 128, 0.08) 0%, transparent 50%)',
          }}
        >
          {/* Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 550,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 24,
              overflow: 'hidden',
            }}
          >
            {/* Card Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 28px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Target icon for 67 reps, or simple indicator */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '2px solid #4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      border: '2px solid #4ade80',
                    }}
                  />
                </div>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#4ade80' }}>{modeLabel}</span>
              </div>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>{dateStr}</span>
            </div>

            {/* Card Body - Player matchup */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                gap: 20,
              }}
            >
              {/* Player 1 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '24px 20px',
                  width: 200,
                  backgroundColor: outcome === 'player1' ? 'rgba(74, 222, 128, 0.05)' : outcome === 'player2' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  border: outcome === 'player1' ? '1px solid rgba(74, 222, 128, 0.3)' : outcome === 'player2' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 16,
                }}
              >
                {outcome === 'player1' && (
                  <span style={{ fontSize: 10, fontWeight: 'bold', color: '#4ade80', marginBottom: 8, letterSpacing: 1 }}>WINNER</span>
                )}
                {outcome === 'player2' && (
                  <span style={{ fontSize: 10, fontWeight: 'bold', color: '#f87171', marginBottom: 8, letterSpacing: 1 }}>LOSER</span>
                )}
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{player1.username}</span>
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    fontStyle: 'italic',
                    color: outcome === 'player1' ? '#4ade80' : outcome === 'player2' ? '#f87171' : '#fff',
                    lineHeight: 1,
                  }}
                >
                  {player1.score !== null ? (is67Reps ? formatTime(player1.score) : player1.score) : '—'}
                </span>
                {player1.score !== null && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>
                    {is67Reps ? 'seconds' : 'reps'}
                  </span>
                )}
              </div>

              {/* VS */}
              <span style={{ fontSize: 16, fontWeight: 'bold', color: 'rgba(255,255,255,0.2)' }}>VS</span>

              {/* Player 2 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '24px 20px',
                  width: 200,
                  backgroundColor: outcome === 'player2' ? 'rgba(74, 222, 128, 0.05)' : outcome === 'player1' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  border: outcome === 'player2' ? '1px solid rgba(74, 222, 128, 0.3)' : outcome === 'player1' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 16,
                }}
              >
                {outcome === 'player2' && (
                  <span style={{ fontSize: 10, fontWeight: 'bold', color: '#4ade80', marginBottom: 8, letterSpacing: 1 }}>WINNER</span>
                )}
                {outcome === 'player1' && (
                  <span style={{ fontSize: 10, fontWeight: 'bold', color: '#f87171', marginBottom: 8, letterSpacing: 1 }}>LOSER</span>
                )}
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{player2.username}</span>
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    fontStyle: 'italic',
                    color: outcome === 'player2' ? '#4ade80' : outcome === 'player1' ? '#f87171' : '#fff',
                    lineHeight: 1,
                  }}
                >
                  {player2.score !== null ? (is67Reps ? formatTime(player2.score) : player2.score) : '—'}
                </span>
                {player2.score !== null && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>
                    {is67Reps ? 'seconds' : 'reps'}
                  </span>
                )}
              </div>
            </div>

            {/* Tie indicator */}
            {outcome === 'tie' && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '0 28px 20px',
                }}
              >
                <div
                  style={{
                    padding: '10px 40px',
                    backgroundColor: 'rgba(234, 179, 8, 0.15)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: 12,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 'bold', color: '#eab308', letterSpacing: 1 }}>DRAW</span>
                </div>
              </div>
            )}

            {/* CTA */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '0 28px 32px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '18px 32px',
                  backgroundColor: '#4ade80',
                  borderRadius: 14,
                }}
              >
                <span style={{ color: '#000', fontSize: 16, fontWeight: 700 }}>
                  Create Your Own Duel @ 67ranked.com
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Duel OG Image error:', error);
    
    // Return a fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              backgroundColor: '#4ade80',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 40, fontWeight: 'bold', color: '#000' }}>67</span>
          </div>
          <span style={{ fontSize: 48, fontWeight: 'bold', color: '#fff' }}>67RANKED</span>
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>
            Duel Mode
          </span>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
