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
    let username = '67Ranked';
    let score = 0;
    let durationMs = DURATION_6_7S;
    let rank: number | null = null;

    // Fetch actual score data if ID provided
    if (scoreId) {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('scores')
        .select('username, score, duration_ms')
        .eq('id', scoreId)
        .single();

      if (data) {
        username = data.username;
        score = data.score;
        durationMs = data.duration_ms;

        // Get rank
        const is67Reps = is67RepsMode(durationMs);
        let rankQuery = supabase
          .from('scores')
          .select('id', { count: 'exact' })
          .eq('duration_ms', durationMs);

        if (is67Reps) {
          rankQuery = rankQuery.lt('score', score);
        } else {
          rankQuery = rankQuery.gt('score', score);
        }

        const { count } = await rankQuery;
        rank = (count || 0) + 1;
      }
    }

    const is67Reps = is67RepsMode(durationMs);
    const modeLabel = durationMs === DURATION_6_7S ? '6.7s Sprint' 
      : durationMs === DURATION_20S ? '20s Endurance'
      : durationMs === DURATION_67_REPS ? '67 Reps Speedrun'
      : `${(durationMs / 1000).toFixed(1)}s`;

    const scoreDisplay = is67Reps 
      ? `${(score / 1000).toFixed(2)}s`
      : `${score} reps`;

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
            backgroundImage: 'linear-gradient(rgba(74, 222, 128, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(74, 222, 128, 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                backgroundColor: '#4ade80',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 15,
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 'bold', color: '#000' }}>67</span>
            </div>
            <span style={{ fontSize: 36, fontWeight: 'bold', color: '#fff' }}>RANKED</span>
          </div>

          {/* Mode Badge */}
          <div
            style={{
              backgroundColor: 'rgba(74, 222, 128, 0.2)',
              padding: '8px 20px',
              borderRadius: 20,
              marginBottom: 20,
            }}
          >
            <span style={{ color: '#4ade80', fontSize: 20, fontWeight: 600 }}>{modeLabel}</span>
          </div>

          {/* Username */}
          <div style={{ fontSize: 32, color: '#fff', marginBottom: 10 }}>{username}</div>

          {/* Score */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: '#4ade80',
              marginBottom: 10,
            }}
          >
            {scoreDisplay}
          </div>

          {/* Rank */}
          {rank && (
            <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)' }}>
              Rank #{rank}
            </div>
          )}

          {/* CTA */}
          <div
            style={{
              marginTop: 40,
              padding: '12px 30px',
              backgroundColor: '#4ade80',
              borderRadius: 12,
            }}
          >
            <span style={{ color: '#000', fontSize: 20, fontWeight: 700 }}>Can you beat this?</span>
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: 30,
              color: 'rgba(255,255,255,0.3)',
              fontSize: 16,
            }}
          >
            67ranked.com
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
