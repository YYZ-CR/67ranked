'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, is67RepsMode } from '@/types/game';

interface ScoreData {
  id: string;
  username: string;
  score: number;
  duration_ms: number;
  created_at: string;
  rank?: number;
  totalPlayers?: number;
}

export default function ScorePage() {
  const params = useParams();
  const scoreId = params.id as string;
  
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const response = await fetch(`/api/score/${scoreId}`);
        if (!response.ok) {
          throw new Error('Score not found');
        }
        const data = await response.json();
        setScoreData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load score');
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [scoreId]);

  const formatDuration = (ms: number) => {
    if (ms === DURATION_6_7S) return '6.7s Sprint';
    if (ms === DURATION_20S) return '20s Endurance';
    if (ms === DURATION_67_REPS) return '67 Reps Speedrun';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatScore = (score: number, duration: number) => {
    if (is67RepsMode(duration)) {
      return `${(score / 1000).toFixed(2)}s`;
    }
    return `${score} reps`;
  };

  const getShareText = () => {
    if (!scoreData) return '';
    const is67Reps = is67RepsMode(scoreData.duration_ms);
    if (is67Reps) {
      return `${scoreData.username} got 67 reps in ${(scoreData.score / 1000).toFixed(2)}s on 67ranked.com. Can you beat their score?`;
    }
    return `${scoreData.username} scored ${scoreData.score} reps on 67ranked.com. Can you beat their score?`;
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = getShareText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: '67Ranked Score',
          text: shareText,
          url: shareUrl
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </main>
    );
  }

  if (error || !scoreData) {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl text-center max-w-md">
          <p className="text-red-400 text-xl mb-4">😔 Score not found</p>
          <p className="text-white/50 mb-6">This score may have been removed or the link is invalid.</p>
          <Link 
            href="/"
            className="inline-block bg-accent-green text-black px-6 py-3 rounded-xl font-semibold hover:bg-accent-green/90 transition-all"
          >
            Play 67Ranked
          </Link>
        </div>
      </main>
    );
  }

  const is67Reps = is67RepsMode(scoreData.duration_ms);
  const percentile = scoreData.rank && scoreData.totalPlayers 
    ? Math.round((1 - (scoreData.rank / scoreData.totalPlayers)) * 100)
    : null;

  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Score Card */}
        <div className="glass-panel p-6 rounded-2xl mb-4">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-block px-4 py-1 bg-accent-green/20 rounded-full mb-3">
              <span className="text-accent-green text-sm font-semibold">
                {formatDuration(scoreData.duration_ms)}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{scoreData.username}</h1>
            {percentile !== null && (
              <p className="text-accent-green text-sm">Top {100 - percentile}% globally</p>
            )}
          </div>

          {/* Score Display */}
          <div className="text-center py-8 border-y border-white/10">
            <p className="text-white/50 text-sm mb-2">
              {is67Reps ? 'Completion Time' : 'Final Score'}
            </p>
            <p className="text-6xl font-black text-accent-green">
              {formatScore(scoreData.score, scoreData.duration_ms)}
            </p>
            {scoreData.rank && (
              <p className="text-white/50 text-sm mt-2">
                Rank #{scoreData.rank}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="text-center pt-4">
            <p className="text-white/30 text-xs">
              {new Date(scoreData.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/"
          className="block w-full bg-accent-green text-black py-4 rounded-xl font-bold text-lg text-center hover:bg-accent-green/90 transition-all mb-3"
        >
          🎮 Beat {scoreData.username}&apos;s Score
        </Link>

        {/* Secondary Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCopyLink}
            className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link href="/" className="text-white/30 text-sm hover:text-white/50 transition-colors">
            67ranked.com
          </Link>
        </div>
      </div>
    </main>
  );
}
