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

    // Calculate rank for this score
    const is67Reps = is67RepsMode(score.duration_ms);
    
    // Count how many scores are better than this one
    let rankQuery = supabase
      .from('scores')
      .select('id', { count: 'exact' })
      .eq('duration_ms', score.duration_ms);
    
    if (is67Reps) {
      // For 67 reps, lower score (time) is better
      rankQuery = rankQuery.lt('score', score.score);
    } else {
      // For timed modes, higher score is better
      rankQuery = rankQuery.gt('score', score.score);
    }

    const { count: betterScores } = await rankQuery;
    const rank = (betterScores || 0) + 1;

    // Get total players for this mode
    const { count: totalPlayers } = await supabase
      .from('scores')
      .select('id', { count: 'exact' })
      .eq('duration_ms', score.duration_ms);

    return NextResponse.json({
      ...score,
      rank,
      totalPlayers: totalPlayers || 0
    });
  } catch (error) {
    console.error('Score fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
