import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { validateUsername } from '@/lib/profanity';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { duelId, username } = body;

    // Validate inputs
    if (!duelId || typeof duelId !== 'string') {
      return NextResponse.json({ error: 'duelId is required' }, { status: 400 });
    }

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json({ error: usernameValidation.reason }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check duel exists and is waiting
    const { data: duel, error: duelError } = await supabase
      .from('duels')
      .select('id, status, expires_at')
      .eq('id', duelId)
      .single();

    if (duelError || !duel) {
      return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
    }

    if (duel.status === 'expired' || new Date(duel.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Duel has expired' }, { status: 400 });
    }

    if (duel.status !== 'waiting') {
      return NextResponse.json({ error: 'Duel is not accepting new players' }, { status: 400 });
    }

    // Check player count
    const { data: players, error: playersError } = await supabase
      .from('duel_players')
      .select('id')
      .eq('duel_id', duelId);

    if (playersError) {
      return NextResponse.json({ error: 'Failed to check players' }, { status: 500 });
    }

    if (players && players.length >= 2) {
      return NextResponse.json({ error: 'Duel is full' }, { status: 400 });
    }

    // Add player B
    const playerKey = randomUUID();
    const { error: joinError } = await supabase
      .from('duel_players')
      .insert({
        duel_id: duelId,
        player_key: playerKey,
        username,
        ready: false
      });

    if (joinError) {
      console.error('Join error:', joinError);
      return NextResponse.json({ error: 'Failed to join duel' }, { status: 500 });
    }

    return NextResponse.json({ player_key: playerKey });
  } catch (error) {
    console.error('Duel join error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
