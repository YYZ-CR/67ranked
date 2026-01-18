import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ duelId: string }> }
) {
  try {
    const { duelId } = await params;

    if (!duelId) {
      return NextResponse.json({ error: 'duelId is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get duel details
    const { data: duelData, error: duelError } = await supabase
      .from('duels')
      .select('id, duration_ms, status, start_at, expires_at')
      .eq('id', duelId)
      .single();

    if (duelError || !duelData) {
      return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
    }

    const duel = duelData as { id: string; duration_ms: number; status: string; start_at: string | null; expires_at: string };

    // Get players
    const { data: playersData, error: playersError } = await supabase
      .from('duel_players')
      .select('player_key, username, ready, score')
      .eq('duel_id', duelId);

    if (playersError) {
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    const players = playersData as Array<{ player_key: string; username: string; ready: boolean; score: number | null }> | null;

    return NextResponse.json({
      duel: {
        id: duel.id,
        duration_ms: duel.duration_ms,
        status: duel.status,
        start_at: duel.start_at ? new Date(duel.start_at).getTime() : null,
        expires_at: new Date(duel.expires_at).getTime()
      },
      players: players?.map(p => ({
        player_key: p.player_key,
        username: p.username,
        ready: p.ready,
        score: p.score
      })) || []
    });
  } catch (error) {
    console.error('Duel fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
