import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { is67RepsMode } from '@/types/game';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const supabase = createServerClient();

    // Fetch the score
    const { data: score, error: scoreError } = await supabase
      .from('scores')
      .select('id, username, score, duration_ms, created_at')
      .eq('id', id)
      .single();

    if (scoreError || !score) {
      return NextResponse.json({ error: 'Score not found' }, { status: 404 });
    }

    const is67Reps = is67RepsMode(score.duration_ms);

    // Get total players for all-time
    const { count: totalPlayers } = await supabase
      .from('scores')
      .select('id', { count: 'exact' })
      .eq('duration_ms', score.duration_ms);

    // Calculate all-time rank
    let allTimeRank = 1;
    if (is67Reps) {
      const { count: betterScores } = await supabase
        .from('scores')
        .select('id', { count: 'exact' })
        .eq('duration_ms', score.duration_ms)
        .lt('score', score.score);
      allTimeRank = (betterScores || 0) + 1;
    } else {
      const { count: betterScores } = await supabase
        .from('scores')
        .select('id', { count: 'exact' })
        .eq('duration_ms', score.duration_ms)
        .gt('score', score.score);
      allTimeRank = (betterScores || 0) + 1;
    }

    // Calculate daily rank (past 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let dailyRank = 1;
    if (is67Reps) {
      const { count: betterDailyScores } = await supabase
        .from('scores')
        .select('id', { count: 'exact' })
        .eq('duration_ms', score.duration_ms)
        .gte('created_at', twentyFourHoursAgo)
        .lt('score', score.score);
      dailyRank = (betterDailyScores || 0) + 1;
    } else {
      const { count: betterDailyScores } = await supabase
        .from('scores')
        .select('id', { count: 'exact' })
        .eq('duration_ms', score.duration_ms)
        .gte('created_at', twentyFourHoursAgo)
        .gt('score', score.score);
      dailyRank = (betterDailyScores || 0) + 1;
    }

    const percentile = totalPlayers ? Math.round((allTimeRank / totalPlayers) * 100) : 1;

    return NextResponse.json({
      ...score,
      dailyRank,
      allTimeRank,
      percentile,
      totalPlayers: totalPlayers || 0
    });
  } catch (error) {
    console.error('Score fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
