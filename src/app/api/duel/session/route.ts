import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSessionToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { duelId, player_key } = body;

    if (!duelId || typeof duelId !== 'string') {
      return NextResponse.json({ error: 'duelId is required' }, { status: 400 });
    }

    if (!player_key || typeof player_key !== 'string') {
      return NextResponse.json({ error: 'player_key is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify player belongs to duel
    const { data: player, error: playerError } = await supabase
      .from('duel_players')
      .select('id')
      .eq('duel_id', duelId)
      .eq('player_key', player_key)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Invalid player' }, { status: 403 });
    }

    // Get duel details
    const { data: duel, error: duelError } = await supabase
      .from('duels')
      .select('id, duration_ms, status, start_at')
      .eq('id', duelId)
      .single();

    if (duelError || !duel) {
      return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
    }

    if (duel.status !== 'active') {
      return NextResponse.json({ error: 'Duel is not active' }, { status: 400 });
    }

    // Create session token
    const token = await createSessionToken({
      mode: 'duel',
      duration_ms: duel.duration_ms,
      duel_id: duelId,
      player_key
    });

    return NextResponse.json({
      token,
      start_at: duel.start_at ? new Date(duel.start_at).getTime() : null,
      duration_ms: duel.duration_ms
    });
  } catch (error) {
    console.error('Duel session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
