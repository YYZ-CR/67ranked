import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, validateSubmissionTiming } from '@/lib/jwt';
import { validateUsername } from '@/lib/profanity';
import { checkRateLimit, createRateLimitKey } from '@/lib/rate-limit';
import { createServerClient } from '@/lib/supabase/server';
import { parseRepEvents, validateTimedRepEvents, validate67RepsEvents } from '@/lib/validation';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, is67RepsMode } from '@/types/game';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, username, score, repEvents: rawRepEvents } = body;

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

    // Parse and validate rep events
    const repEvents = parseRepEvents(rawRepEvents);
    if (!repEvents) {
      return NextResponse.json({ error: 'Invalid or missing rep events' }, { status: 400 });
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

    // Validate rep events against the claimed score
    if (is67Reps) {
      const repValidation = validate67RepsEvents(repEvents, score);
      if (!repValidation.valid) {
        return NextResponse.json({ error: repValidation.reason }, { status: 400 });
      }
    } else {
      const repValidation = validateTimedRepEvents(repEvents, score, payload.duration_ms);
      if (!repValidation.valid) {
        return NextResponse.json({ error: repValidation.reason }, { status: 400 });
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
    // session_id enforces single-use tokens (unique constraint in DB)
    const supabase = createServerClient();
    const { data, error: dbError } = await supabase
      .from('scores')
      .insert({
        username,
        score,
        duration_ms: payload.duration_ms,
        session_id: payload.session_id
      })
      .select('id')
      .single();

    if (dbError) {
      // Check for duplicate session_id (token reuse attempt)
      if (dbError.code === '23505' && dbError.message?.includes('session_id')) {
        return NextResponse.json({ error: 'This session has already been used' }, { status: 400 });
      }
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
    }

    // Calculate ranks and percentile
    // is67Reps is already defined earlier in the function
    
    // Get total count for all-time
    const { count: totalCount } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('duration_ms', payload.duration_ms);

    // Get all-time rank (count of better scores + 1)
    let allTimeRank = 1;
    if (is67Reps) {
      const { count: betterScores } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .eq('duration_ms', payload.duration_ms)
        .lt('score', score);
      allTimeRank = (betterScores || 0) + 1;
    } else {
      const { count: betterScores } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .eq('duration_ms', payload.duration_ms)
        .gt('score', score);
      allTimeRank = (betterScores || 0) + 1;
    }

    // Get daily rank (past 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let dailyRank = 1;
    if (is67Reps) {
      const { count: betterDailyScores } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .eq('duration_ms', payload.duration_ms)
        .gte('created_at', twentyFourHoursAgo)
        .lt('score', score);
      dailyRank = (betterDailyScores || 0) + 1;
    } else {
      const { count: betterDailyScores } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .eq('duration_ms', payload.duration_ms)
        .gte('created_at', twentyFourHoursAgo)
        .gt('score', score);
      dailyRank = (betterDailyScores || 0) + 1;
    }

    const percentile = totalCount ? Math.round((allTimeRank / totalCount) * 100) : 1;

    return NextResponse.json({ 
      scoreId: data.id,
      dailyRank,
      allTimeRank,
      percentile,
      totalCount
    });
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
