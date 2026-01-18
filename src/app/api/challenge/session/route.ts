import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSessionToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challengeId, player_key } = body;

    if (!challengeId || typeof challengeId !== 'string') {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    if (!player_key || typeof player_key !== 'string') {
      return NextResponse.json({ error: 'player_key is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, duration_ms, status, expires_at')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    if (challenge.status === 'expired' || new Date(challenge.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Challenge has expired' }, { status: 400 });
    }

    // Check if this player already submitted
    const { data: existingEntry } = await supabase
      .from('challenge_entries')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('player_key', player_key)
      .single();

    if (existingEntry) {
      return NextResponse.json({ error: 'You have already submitted a score' }, { status: 400 });
    }

    // Create session token
    const token = await createSessionToken({
      mode: 'challenge',
      duration_ms: challenge.duration_ms,
      challenge_id: challengeId,
      player_key
    });

    return NextResponse.json({
      token,
      duration_ms: challenge.duration_ms
    });
  } catch (error) {
    console.error('Challenge session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
