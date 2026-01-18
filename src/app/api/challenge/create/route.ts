import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { validateUsername } from '@/lib/profanity';
import { MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION } from '@/types/game';
import { randomUUID } from 'crypto';

const CHALLENGE_EXPIRY_DAYS = 7;

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
    
    // Create challenge
    const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const playerKey = randomUUID();

    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .insert({
        duration_ms,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select('id')
      .single();

    if (challengeError) {
      console.error('Challenge creation error:', challengeError);
      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${appUrl}/challenge/${challenge.id}`;

    return NextResponse.json({
      challengeId: challenge.id,
      player_key: playerKey,
      shareUrl
    });
  } catch (error) {
    console.error('Challenge create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
