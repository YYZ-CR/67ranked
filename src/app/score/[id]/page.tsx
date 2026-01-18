'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, is67RepsMode } from '@/types/game';
import { TrophyIcon, ShareIcon, PlayIcon, HomeIcon, FlameIcon, TimerIcon, TargetIcon } from '@/components/ui/Icons';

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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <TrophyIcon size={32} className="text-white/50" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Score Not Found</h2>
          <p className="text-white/50 mb-6">This score may have been removed or the link is invalid.</p>
          <Link 
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-accent-green text-black px-6 py-3 rounded-xl font-semibold hover:bg-accent-green/90 transition-all"
          >
            <PlayIcon size={18} />
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

  const getModeIcon = () => {
    if (scoreData.duration_ms === DURATION_6_7S) return <FlameIcon size={16} />;
    if (scoreData.duration_ms === DURATION_20S) return <TimerIcon size={16} />;
    if (scoreData.duration_ms === DURATION_67_REPS) return <TargetIcon size={16} />;
    return <TimerIcon size={16} />;
  };

  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Score Card */}
        <div className="glass-panel p-8 rounded-2xl mb-4">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrophyIcon size={28} className="text-yellow-400" />
              <h1 className="text-3xl font-bold text-white">Score Card</h1>
            </div>
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent-green/20 rounded-full">
              {getModeIcon()}
              <span className="text-accent-green text-sm font-semibold uppercase tracking-wider">
                {formatDuration(scoreData.duration_ms)}
              </span>
            </div>
          </div>

          {/* Player Score Box */}
          <div className="bg-accent-green/20 ring-2 ring-accent-green rounded-xl p-6 text-center mb-4">
            <p className="text-white/60 text-sm mb-1 uppercase tracking-wider">{scoreData.username}</p>
            <p className="text-5xl font-black text-accent-green">
              {formatScore(scoreData.score, scoreData.duration_ms)}
            </p>
            {scoreData.rank && (
              <p className="text-white/50 text-sm mt-2">
                Rank #{scoreData.rank}
                {percentile !== null && ` • Top ${100 - percentile}%`}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="text-center">
            <p className="text-white/30 text-xs">
              {new Date(scoreData.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* CTA Button */}
          <Link
            href="/"
            className="w-full bg-accent-green text-black py-4 rounded-xl font-bold text-lg hover:bg-accent-green/90 transition-all flex items-center justify-center gap-2"
          >
            <PlayIcon size={22} />
            Beat {scoreData.username}&apos;s Score
          </Link>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <ShareIcon size={20} />
            Share
          </button>

          {/* Copy & Home */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <Link
              href="/"
              className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
            >
              <HomeIcon size={18} />
              Home
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/30 text-xs">67ranked.com</p>
        </div>
      </div>
    </main>
  );
}
