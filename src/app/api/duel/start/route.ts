import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { duelId } = body;

    if (!duelId || typeof duelId !== 'string') {
      return NextResponse.json({ error: 'duelId is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check duel exists
    const { data: duel, error: duelError } = await supabase
      .from('duels')
      .select('id, status, duration_ms')
      .eq('id', duelId)
      .single();

    if (duelError || !duel) {
      return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
    }

    if (duel.status !== 'waiting') {
      return NextResponse.json({ error: 'Duel cannot be started' }, { status: 400 });
    }

    // Check both players are ready
    const { data: players, error: playersError } = await supabase
      .from('duel_players')
      .select('id, ready')
      .eq('duel_id', duelId);

    if (playersError) {
      return NextResponse.json({ error: 'Failed to check players' }, { status: 500 });
    }

    if (!players || players.length !== 2) {
      return NextResponse.json({ error: 'Need exactly 2 players to start' }, { status: 400 });
    }

    if (!players.every(p => p.ready)) {
      return NextResponse.json({ error: 'All players must be ready' }, { status: 400 });
    }

    // Set start time (5 seconds from now to allow sync)
    const startAt = new Date(Date.now() + 5000);

    // Update duel status
    const { error: updateError } = await supabase
      .from('duels')
      .update({
        status: 'active',
        start_at: startAt.toISOString()
      })
      .eq('id', duelId);

    if (updateError) {
      console.error('Start update error:', updateError);
      return NextResponse.json({ error: 'Failed to start duel' }, { status: 500 });
    }

    return NextResponse.json({ start_at: startAt.getTime() });
  } catch (error) {
    console.error('Duel start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
