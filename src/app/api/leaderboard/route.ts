import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, LeaderboardEntry, is67RepsMode } from '@/types/game';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const durationParam = searchParams.get('duration_ms');

    // Validate duration parameter
    if (!durationParam) {
      return NextResponse.json(
        { error: 'duration_ms query parameter is required' },
        { status: 400 }
      );
    }

    const duration = parseInt(durationParam, 10);
    if (duration !== DURATION_6_7S && duration !== DURATION_20S && duration !== DURATION_67_REPS) {
      return NextResponse.json(
        { error: 'duration_ms must be 6700, 20000, or -1 (67 reps)' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const is67Reps = is67RepsMode(duration);

    // Fetch top 100 scores for the specified duration
    // For 67 reps mode: lower time is better (ASC)
    // For timed modes: higher reps is better (DESC)
    const { data: scores, error: dbError } = await supabase
      .from('scores')
      .select('id, username, score, created_at')
      .eq('duration_ms', duration)
      .order('score', { ascending: is67Reps }) // ASC for time, DESC for reps
      .order('created_at', { ascending: true })
      .limit(100);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Calculate ranks (ties share the same rank)
    const entries: LeaderboardEntry[] = [];
    let currentRank = 1;
    let lastScore: number | null = null;
    let sameScoreCount = 0;

    for (let i = 0; i < scores.length; i++) {
      const score = scores[i];
      
      // For 67 reps (ASC), a higher score means worse rank
      // For timed modes (DESC), a lower score means worse rank
      const scoreChanged = is67Reps 
        ? (lastScore !== null && score.score > lastScore)
        : (lastScore !== null && score.score < lastScore);
      
      if (scoreChanged) {
        currentRank += sameScoreCount;
        sameScoreCount = 1;
      } else if (lastScore !== null && score.score === lastScore) {
        sameScoreCount++;
      } else {
        sameScoreCount = 1;
      }

      entries.push({
        id: score.id,
        username: score.username,
        score: score.score,
        rank: currentRank,
        created_at: score.created_at
      });

      lastScore = score.score;
    }

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
