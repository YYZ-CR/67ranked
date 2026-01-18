import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifySessionToken, validateSubmissionTiming } from '@/lib/jwt';
import { validateUsername } from '@/lib/profanity';
import { checkRateLimit, createRateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, score, username } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
      return NextResponse.json({ error: 'Score must be a non-negative integer' }, { status: 400 });
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json({ error: usernameValidation.reason }, { status: 400 });
    }

    // Verify token
    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (payload.mode !== 'challenge') {
      return NextResponse.json({ error: 'Invalid token mode' }, { status: 400 });
    }

    if (!payload.challenge_id || !payload.player_key) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });
    }

    // Validate timing
    const timingValidation = validateSubmissionTiming(payload, Date.now());
    if (!timingValidation.valid) {
      return NextResponse.json({ error: timingValidation.reason }, { status: 400 });
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const rateLimitKey = createRateLimitKey(ip, payload.player_key);
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limited. Try again in ${rateLimit.retryAfter} seconds` },
        { status: 429 }
      );
    }

    const supabase = createServerClient();

    // Insert entry
    const { error: insertError } = await supabase
      .from('challenge_entries')
      .insert({
        challenge_id: payload.challenge_id,
        player_key: payload.player_key,
        username,
        score
      });

    if (insertError) {
      // Check if duplicate
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already submitted a score' }, { status: 400 });
      }
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
    }

    // Check if both players have submitted
    const { data: entries, error: entriesError } = await supabase
      .from('challenge_entries')
      .select('username, score, player_key')
      .eq('challenge_id', payload.challenge_id);

    if (entriesError) {
      return NextResponse.json({ error: 'Failed to check results' }, { status: 500 });
    }

    if (entries && entries.length >= 2) {
      // Mark challenge as complete
      await supabase
        .from('challenges')
        .update({ status: 'complete' })
        .eq('id', payload.challenge_id);

      // Determine winner
      const myEntry = entries.find(e => e.player_key === payload.player_key);
      const opponent = entries.find(e => e.player_key !== payload.player_key);

      let outcome: 'win' | 'lose' | 'tie' = 'tie';
      if (myEntry && opponent) {
        if (myEntry.score > opponent.score) outcome = 'win';
        else if (myEntry.score < opponent.score) outcome = 'lose';
      }

      return NextResponse.json({
        status: 'complete',
        result: {
          myScore: myEntry?.score,
          myUsername: myEntry?.username,
          opponentScore: opponent?.score,
          opponentUsername: opponent?.username,
          outcome
        }
      });
    }

    return NextResponse.json({ status: 'waiting' });
  } catch (error) {
    console.error('Challenge submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
