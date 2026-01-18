import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { duelId, player_key, ready } = body;

    // Validate inputs
    if (!duelId || typeof duelId !== 'string') {
      return NextResponse.json({ error: 'duelId is required' }, { status: 400 });
    }

    if (!player_key || typeof player_key !== 'string') {
      return NextResponse.json({ error: 'player_key is required' }, { status: 400 });
    }

    if (typeof ready !== 'boolean') {
      return NextResponse.json({ error: 'ready must be a boolean' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Update player ready status
    const { error: updateError } = await supabase
      .from('duel_players')
      .update({ ready })
      .eq('duel_id', duelId)
      .eq('player_key', player_key);

    if (updateError) {
      console.error('Ready update error:', updateError);
      return NextResponse.json({ error: 'Failed to update ready status' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Duel ready error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
