import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { validateUsername } from '@/lib/profanity';
import { MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION } from '@/types/game';
import { randomUUID } from 'crypto';

const DUEL_EXPIRY_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, duration_ms } = body;

    // Validate username
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json({ error: usernameValidation.reason }, { status: 400 });
    }

    // Validate duration
    if (typeof duration_ms !== 'number') {
      return NextResponse.json({ error: 'duration_ms is required' }, { status: 400 });
    }

    if (duration_ms < MIN_CUSTOM_DURATION || duration_ms > MAX_CUSTOM_DURATION) {
      return NextResponse.json(
        { error: `duration_ms must be between ${MIN_CUSTOM_DURATION}ms and ${MAX_CUSTOM_DURATION}ms` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    
    // Create duel
    const expiresAt = new Date(Date.now() + DUEL_EXPIRY_MINUTES * 60 * 1000);
    const playerKey = randomUUID();

    const { data: duel, error: duelError } = await supabase
      .from('duels')
      .insert({
        duration_ms,
        status: 'waiting',
        expires_at: expiresAt.toISOString()
      })
      .select('id')
      .single();

    if (duelError) {
      console.error('Duel creation error:', duelError);
      return NextResponse.json({ error: 'Failed to create duel' }, { status: 500 });
    }

    // Add player A
    const { error: playerError } = await supabase
      .from('duel_players')
      .insert({
        duel_id: duel.id,
        player_key: playerKey,
        username,
        ready: false
      });

    if (playerError) {
      console.error('Player creation error:', playerError);
      return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${appUrl}/duel/${duel.id}`;

    return NextResponse.json({
      duelId: duel.id,
      player_key: playerKey,
      shareUrl
    });
  } catch (error) {
    console.error('Duel create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
