import { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { is67RepsMode, DURATION_6_7S, DURATION_20S, DURATION_67_REPS } from '@/types/game';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const supabase = createServerClient();
    const { data: score } = await supabase
      .from('scores')
      .select('username, score, duration_ms')
      .eq('id', id)
      .single();

    if (!score) {
      return {
        title: '67Ranked - Score Not Found',
        description: 'This score could not be found.',
      };
    }

    const is67Reps = is67RepsMode(score.duration_ms);
    const modeLabel = score.duration_ms === DURATION_6_7S ? '6.7s' 
      : score.duration_ms === DURATION_20S ? '20s'
      : score.duration_ms === DURATION_67_REPS ? '67 Reps'
      : `${(score.duration_ms / 1000).toFixed(1)}s`;

    const scoreDisplay = is67Reps 
      ? `${(score.score / 1000).toFixed(2)}s`
      : `${score.score} reps`;

    const title = `${score.username} scored ${scoreDisplay} on 67Ranked`;
    const description = is67Reps
      ? `${score.username} completed 67 reps in ${scoreDisplay} on 67Ranked. Can you beat their time?`
      : `${score.username} got ${scoreDisplay} in ${modeLabel} on 67Ranked. Can you beat their score?`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://67ranked.com';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: [
          {
            url: `${appUrl}/api/og?id=${id}`,
            width: 1200,
            height: 630,
            alt: `${score.username}'s score on 67Ranked`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`${appUrl}/api/og?id=${id}`],
      },
    };
  } catch {
    return {
      title: '67Ranked - Hand Motion Game',
      description: 'Compete globally in this camera-powered hand motion game.',
    };
  }
}

export default function ScoreLayout({ children }: Props) {
  return children;
}
