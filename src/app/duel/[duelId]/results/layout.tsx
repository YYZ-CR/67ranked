import { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { is67RepsMode } from '@/types/game';

interface Props {
  params: Promise<{ duelId: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { duelId } = await params;
  
  try {
    const supabase = createServerClient();
    
    // Fetch duel data
    const { data: duel } = await supabase
      .from('duels')
      .select('duration_ms, status')
      .eq('id', duelId)
      .single();
    
    // Fetch players
    const { data: players } = await supabase
      .from('duel_players')
      .select('username, score')
      .eq('duel_id', duelId)
      .order('id', { ascending: true });

    if (!duel || !players || players.length < 2) {
      return {
        title: 'Duel Results | 67Ranked',
        description: 'View duel results on 67Ranked',
      };
    }

    const is67Reps = is67RepsMode(duel.duration_ms);
    const formatTime = (ms: number) => (ms / 1000).toFixed(2) + 's';
    
    const player1 = players[0];
    const player2 = players[1];
    const bothSubmitted = player1?.score !== null && player2?.score !== null;

    let description = `${player1.username} vs ${player2.username}`;
    
    if (bothSubmitted) {
      const score1 = is67Reps ? formatTime(player1.score!) : `${player1.score} reps`;
      const score2 = is67Reps ? formatTime(player2.score!) : `${player2.score} reps`;
      
      // Determine winner
      let winner: string;
      if (is67Reps) {
        winner = player1.score! < player2.score! ? player1.username 
               : player2.score! < player1.score! ? player2.username 
               : 'Tie';
      } else {
        winner = player1.score! > player2.score! ? player1.username 
               : player2.score! > player1.score! ? player2.username 
               : 'Tie';
      }
      
      description = winner === 'Tie' 
        ? `${player1.username} tied with ${player2.username} (${score1} vs ${score2})`
        : `${winner} won! ${score1} vs ${score2}`;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://67ranked.vercel.app';

    return {
      title: `⚔️ Duel: ${player1.username} vs ${player2.username} | 67Ranked`,
      description,
      openGraph: {
        title: `⚔️ Duel: ${player1.username} vs ${player2.username}`,
        description,
        url: `${appUrl}/duel/${duelId}/results`,
        siteName: '67Ranked',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `⚔️ Duel: ${player1.username} vs ${player2.username}`,
        description,
      },
    };
  } catch {
    return {
      title: 'Duel Results | 67Ranked',
      description: 'View duel results on 67Ranked',
    };
  }
}

export default function DuelResultsLayout({ children }: Props) {
  return children;
}
