import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { challengeId } = await params;

    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get challenge details
    const { data: challengeData, error: challengeError } = await supabase
      .from('challenges')
      .select('id, duration_ms, status, expires_at')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challengeData) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const challenge = challengeData as { id: string; duration_ms: number; status: string; expires_at: string };

    // Get entries
    const { data: entriesData, error: entriesError } = await supabase
      .from('challenge_entries')
      .select('player_key, username, score, submitted_at')
      .eq('challenge_id', challengeId);

    if (entriesError) {
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }

    const entries = entriesData as Array<{ player_key: string; username: string; score: number; submitted_at: string }> | null;

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        duration_ms: challenge.duration_ms,
        status: challenge.status,
        expires_at: new Date(challenge.expires_at).getTime()
      },
      entries: entries?.map(e => ({
        player_key: e.player_key,
        username: e.username,
        score: e.score,
        submitted_at: e.submitted_at
      })) || []
    });
  } catch (error) {
    console.error('Challenge fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
