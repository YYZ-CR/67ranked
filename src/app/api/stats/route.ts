import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get count of unique usernames (players)
    const { count: totalGames, error: gamesError } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true });

    if (gamesError) {
      console.error('Database error:', gamesError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Get unique players (distinct usernames)
    const { data: uniquePlayers, error: playersError } = await supabase
      .from('scores')
      .select('username')
      .limit(10000); // Get up to 10k to count unique

    if (playersError) {
      console.error('Database error:', playersError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    const uniqueUsernames = new Set(uniquePlayers?.map(p => p.username) || []);

    return NextResponse.json({
      totalGames: totalGames || 0,
      totalPlayers: uniqueUsernames.size
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
