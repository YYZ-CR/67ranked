import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, validateSubmissionTiming } from '@/lib/jwt';
import { validateUsername } from '@/lib/profanity';
import { checkRateLimit, createRateLimitKey } from '@/lib/rate-limit';
import { createServerClient } from '@/lib/supabase/server';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, is67RepsMode } from '@/types/game';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, username, score } = body;

    // Validate required fields
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

    // Verify JWT token
    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Validate mode
    if (payload.mode !== 'normal') {
      return NextResponse.json({ error: 'Invalid token mode for this endpoint' }, { status: 400 });
    }

    // For 67 reps mode, we have different timing validation (no fixed duration)
    const is67Reps = is67RepsMode(payload.duration_ms);
    
    if (!is67Reps) {
      // Validate timing for timed modes
      const timingValidation = validateSubmissionTiming(payload, Date.now());
      if (!timingValidation.valid) {
        return NextResponse.json({ error: timingValidation.reason }, { status: 400 });
      }
    }

    // Only allow leaderboard submissions for standard durations
    if (payload.duration_ms !== DURATION_6_7S && payload.duration_ms !== DURATION_20S && payload.duration_ms !== DURATION_67_REPS) {
      return NextResponse.json(
        { error: 'Only 6.7s, 20s, and 67 Reps rounds can be submitted to the leaderboard' },
        { status: 400 }
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const rateLimitKey = createRateLimitKey(ip);
    const rateLimit = checkRateLimit(rateLimitKey, { windowMs: 10000, maxRequests: 1 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limited. Try again in ${rateLimit.retryAfter} seconds` },
        { status: 429 }
      );
    }

    // Insert score into database
    // For 67 reps mode, score is elapsed time in ms
    // For timed modes, score is rep count
    const supabase = createServerClient();
    const { data, error: dbError } = await supabase
      .from('scores')
      .insert({
        username,
        score,
        duration_ms: payload.duration_ms
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
    }

    return NextResponse.json({ scoreId: data.id });
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
