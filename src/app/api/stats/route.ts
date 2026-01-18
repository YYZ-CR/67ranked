import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get total number of games played
    const { count: totalGames, error: gamesError } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true });

    if (gamesError) {
      console.error('Database error:', gamesError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    return NextResponse.json({
      totalGames: totalGames || 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
