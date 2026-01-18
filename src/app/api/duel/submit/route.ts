import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifySessionToken, validateSubmissionTiming } from '@/lib/jwt';
import { checkRateLimit, createRateLimitKey } from '@/lib/rate-limit';
import { is67RepsMode } from '@/types/game';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, score } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
      return NextResponse.json({ error: 'Score must be a non-negative integer' }, { status: 400 });
    }

    // Verify token
    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (payload.mode !== 'duel') {
      return NextResponse.json({ error: 'Invalid token mode' }, { status: 400 });
    }

    if (!payload.duel_id || !payload.player_key) {
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

    // Update player score
    const { error: updateError } = await supabase
      .from('duel_players')
      .update({
        score,
        submitted_at: new Date().toISOString()
      })
      .eq('duel_id', payload.duel_id)
      .eq('player_key', payload.player_key);

    if (updateError) {
      console.error('Score update error:', updateError);
      return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
    }

    // Check if both players have submitted
    const { data: players, error: playersError } = await supabase
      .from('duel_players')
      .select('username, score, player_key')
      .eq('duel_id', payload.duel_id);

    if (playersError) {
      return NextResponse.json({ error: 'Failed to check results' }, { status: 500 });
    }

    const allSubmitted = players?.every(p => p.score !== null);

    if (allSubmitted && players) {
      // Mark duel as complete
      await supabase
        .from('duels')
        .update({ status: 'complete' })
        .eq('id', payload.duel_id);

      // Get duel info to check mode
      const { data: duel } = await supabase
        .from('duels')
        .select('duration_ms')
        .eq('id', payload.duel_id)
        .single();

      const is67Reps = duel && is67RepsMode(duel.duration_ms);

      // Determine winner
      const myPlayer = players.find(p => p.player_key === payload.player_key);
      const opponent = players.find(p => p.player_key !== payload.player_key);

      let outcome: 'win' | 'lose' | 'tie' = 'tie';
      if (myPlayer && opponent && myPlayer.score !== null && opponent.score !== null) {
        if (is67Reps) {
          // 67 reps mode: lower time (score) wins
          if (myPlayer.score < opponent.score) outcome = 'win';
          else if (myPlayer.score > opponent.score) outcome = 'lose';
        } else {
          // Timed mode: higher reps (score) wins
          if (myPlayer.score > opponent.score) outcome = 'win';
          else if (myPlayer.score < opponent.score) outcome = 'lose';
        }
      }

      return NextResponse.json({
        status: 'complete',
        result: {
          myScore: myPlayer?.score,
          myUsername: myPlayer?.username,
          opponentScore: opponent?.score,
          opponentUsername: opponent?.username,
          outcome
        }
      });
    }

    return NextResponse.json({ status: 'waiting' });
  } catch (error) {
    console.error('Duel submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
