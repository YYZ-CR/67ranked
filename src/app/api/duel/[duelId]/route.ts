import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ duelId: string }> }
) {
  try {
    const { duelId } = await params;

    if (!duelId) {
      return NextResponse.json({ error: 'duelId is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get duel details
    const { data: duelData, error: duelError } = await supabase
      .from('duels')
      .select('id, duration_ms, status, start_at, expires_at')
      .eq('id', duelId)
      .single();

    if (duelError || !duelData) {
      return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
    }

    const duel = duelData as { id: string; duration_ms: number; status: string; start_at: string | null; expires_at: string };

    // Get players
    const { data: playersData, error: playersError } = await supabase
      .from('duel_players')
      .select('player_key, username, ready, score')
      .eq('duel_id', duelId);

    if (playersError) {
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    const players = playersData as Array<{ player_key: string; username: string; ready: boolean; score: number | null }> | null;

    // Calculate rank stats if duel is complete and it's a standard duration
    const isStandardDuration = 
      duel.duration_ms === DURATION_6_7S || 
      duel.duration_ms === DURATION_20S || 
      duel.duration_ms === DURATION_67_REPS;
    
    const is67Reps = is67RepsMode(duel.duration_ms);
    
    let rankStats: Record<string, { dailyRank: number; allTimeRank: number; percentile: number }> = {};
    
    if (duel.status === 'complete' && isStandardDuration && players) {
      for (const player of players) {
        if (player.score !== null) {
          rankStats[player.player_key] = await calculateRankStats(
            supabase,
            duel.duration_ms,
            player.score,
            is67Reps
          );
        }
      }
    }

    return NextResponse.json({
      duel: {
        id: duel.id,
        duration_ms: duel.duration_ms,
        status: duel.status,
        start_at: duel.start_at ? new Date(duel.start_at).getTime() : null,
        expires_at: new Date(duel.expires_at).getTime()
      },
      players: players?.map(p => ({
        player_key: p.player_key,
        username: p.username,
        ready: p.ready,
        score: p.score,
        rankStats: rankStats[p.player_key] || null
      })) || []
    });
  } catch (error) {
    console.error('Duel fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
