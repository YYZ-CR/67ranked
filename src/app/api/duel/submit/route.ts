import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifySessionToken, validateSubmissionTiming } from '@/lib/jwt';
import { checkRateLimit, createRateLimitKey } from '@/lib/rate-limit';
import { is67RepsMode, DURATION_6_7S, DURATION_20S, DURATION_67_REPS } from '@/types/game';

// Helper to calculate rank stats for a score
async function calculateRankStats(
  supabase: ReturnType<typeof createServerClient>,
  duration_ms: number,
  score: number,
  is67Reps: boolean
) {
  // Get total count for all-time
  const { count: totalCount } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .eq('duration_ms', duration_ms);

  // Get all-time rank (count of better scores + 1)
  let allTimeRank = 1;
  if (is67Reps) {
    const { count: betterScores } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('duration_ms', duration_ms)
      .lt('score', score);
    allTimeRank = (betterScores || 0) + 1;
  } else {
    const { count: betterScores } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('duration_ms', duration_ms)
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
      .eq('duration_ms', duration_ms)
      .gte('created_at', twentyFourHoursAgo)
      .lt('score', score);
    dailyRank = (betterDailyScores || 0) + 1;
  } else {
    const { count: betterDailyScores } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('duration_ms', duration_ms)
      .gte('created_at', twentyFourHoursAgo)
      .gt('score', score);
    dailyRank = (betterDailyScores || 0) + 1;
  }

  const percentile = totalCount ? Math.round((allTimeRank / totalCount) * 100) : 1;

  return { dailyRank, allTimeRank, percentile, totalCount: totalCount || 0 };
}

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

      // Save scores to leaderboard for standard durations
      const isStandardDuration = duel && (
        duel.duration_ms === DURATION_6_7S || 
        duel.duration_ms === DURATION_20S || 
        duel.duration_ms === DURATION_67_REPS
      );

      let myRankStats = null;
      let opponentRankStats = null;

      if (isStandardDuration && duel && myPlayer && opponent && myPlayer.score !== null && opponent.score !== null) {
        // Insert both players' scores into the leaderboard
        await supabase.from('scores').insert([
          { username: myPlayer.username, score: myPlayer.score, duration_ms: duel.duration_ms },
          { username: opponent.username, score: opponent.score, duration_ms: duel.duration_ms }
        ]);

        // Calculate rank stats for both players
        myRankStats = await calculateRankStats(supabase, duel.duration_ms, myPlayer.score, !!is67Reps);
        opponentRankStats = await calculateRankStats(supabase, duel.duration_ms, opponent.score, !!is67Reps);
      }

      return NextResponse.json({
        status: 'complete',
        result: {
          myScore: myPlayer?.score,
          myUsername: myPlayer?.username,
          opponentScore: opponent?.score,
          opponentUsername: opponent?.username,
          outcome,
          myRankStats,
          opponentRankStats
        }
      });
    }

    return NextResponse.json({ status: 'waiting' });
  } catch (error) {
    console.error('Duel submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
