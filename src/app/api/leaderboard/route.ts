import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { DURATION_6_7S, DURATION_20S, LeaderboardEntry } from '@/types/game';

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
    if (duration !== DURATION_6_7S && duration !== DURATION_20S) {
      return NextResponse.json(
        { error: 'duration_ms must be 6700 or 20000' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch top 100 scores for the specified duration
    // Ordered by score DESC, then created_at ASC for ties
    const { data: scores, error: dbError } = await supabase
      .from('scores')
      .select('id, username, score, created_at')
      .eq('duration_ms', duration)
      .order('score', { ascending: false })
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
      
      if (lastScore !== null && score.score < lastScore) {
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
