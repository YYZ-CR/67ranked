import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { is67RepsMode, DURATION_6_7S, DURATION_20S, DURATION_67_REPS } from '@/types/game';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const scoreId = searchParams.get('id');

    // Default values for preview
    let username = 'Player';
    let score = 0;
    let durationMs = DURATION_6_7S;
    let dailyRank: number | null = null;
    let allTimeRank: number | null = null;
    let totalPlayers = 0;
    let createdAt = new Date().toISOString();

    // Fetch actual score data if ID provided
    if (scoreId) {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('scores')
        .select('username, score, duration_ms, created_at')
        .eq('id', scoreId)
        .single();

      if (data) {
        username = data.username;
        score = data.score;
        durationMs = data.duration_ms;
        createdAt = data.created_at;

        const is67Reps = is67RepsMode(durationMs);
        
        // Total count for all-time
        const { count: total } = await supabase
          .from('scores')
          .select('*', { count: 'exact', head: true })
          .eq('duration_ms', durationMs);
        totalPlayers = total || 0;

        // All-time rank
        if (is67Reps) {
          const { count } = await supabase
            .from('scores')
            .select('id', { count: 'exact', head: true })
            .eq('duration_ms', durationMs)
            .lt('score', score);
          allTimeRank = (count || 0) + 1;
        } else {
          const { count } = await supabase
            .from('scores')
            .select('id', { count: 'exact', head: true })
            .eq('duration_ms', durationMs)
            .gt('score', score);
          allTimeRank = (count || 0) + 1;
        }

        // Daily rank (past 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        if (is67Reps) {
          const { count } = await supabase
            .from('scores')
            .select('id', { count: 'exact', head: true })
            .eq('duration_ms', durationMs)
            .gte('created_at', twentyFourHoursAgo)
            .lt('score', score);
          dailyRank = (count || 0) + 1;
        } else {
          const { count } = await supabase
            .from('scores')
            .select('id', { count: 'exact', head: true })
            .eq('duration_ms', durationMs)
            .gte('created_at', twentyFourHoursAgo)
            .gt('score', score);
          dailyRank = (count || 0) + 1;
        }
      }
    }

    const is67Reps = is67RepsMode(durationMs);
    const modeLabel = durationMs === DURATION_6_7S ? '6.7s Sprint' 
      : durationMs === DURATION_20S ? '20s Endurance'
      : durationMs === DURATION_67_REPS ? '67 Reps'
      : `${(durationMs / 1000).toFixed(1)}s`;

    const scoreDisplay = is67Reps 
      ? (score / 1000).toFixed(2)
      : score.toString();
    
    const scoreUnit = is67Reps ? 's' : ' reps';
    
    const percentile = allTimeRank && totalPlayers ? Math.round((allTimeRank / totalPlayers) * 100) : null;
    
    const dateStr = new Date(createdAt).toLocaleDateString('en-US', {
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
                <div
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: '#4ade80',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 'bold', color: '#000' }}>67</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#4ade80' }}>{modeLabel}</span>
              </div>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>{dateStr}</span>
            </div>

            {/* Card Body */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '40px 28px 50px',
              }}
            >
              {/* Username */}
              <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                {username}
              </div>

              {/* Score */}
              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 24 }}>
                <span
                  style={{
                    fontSize: 96,
                    fontWeight: 900,
                    color: '#4ade80',
                    lineHeight: 1,
                  }}
                >
                  {scoreDisplay}
                </span>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    color: '#4ade80',
                    marginLeft: 4,
                  }}
                >
                  {scoreUnit}
                </span>
              </div>

              {/* Rank Boxes */}
              {dailyRank && allTimeRank && percentile && (
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px 24px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 12,
                      minWidth: 100,
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 500 }}>DAILY</span>
                    <span style={{ fontSize: 22, fontWeight: 'bold', color: '#fff' }}>#{dailyRank}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px 24px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 12,
                      minWidth: 100,
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 500 }}>ALL-TIME</span>
                    <span style={{ fontSize: 22, fontWeight: 'bold', color: '#fff' }}>#{allTimeRank}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px 24px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 12,
                      minWidth: 100,
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 500 }}>TOP</span>
                    <span style={{ fontSize: 22, fontWeight: 'bold', color: '#4ade80' }}>{percentile}%</span>
                  </div>
                </div>
              )}
            </div>

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
                <span style={{ color: '#000', fontSize: 18, fontWeight: 700 }}>
                  Beat {username}&apos;s Score @ 67ranked.com
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
    console.error('OG Image error:', error);
    
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
            Camera-powered hand motion game
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
