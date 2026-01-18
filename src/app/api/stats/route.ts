import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get total number of solo games played
    const { count: soloGames, error: soloError } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true });

    if (soloError) {
      console.error('Database error:', soloError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Get total number of duel plays (players who submitted a score)
    const { count: duelPlays, error: duelError } = await supabase
      .from('duel_players')
      .select('*', { count: 'exact', head: true })
      .not('score', 'is', null);

    if (duelError) {
      console.error('Database error:', duelError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    return NextResponse.json({
      totalGames: (soloGames || 0) + (duelPlays || 0)
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
