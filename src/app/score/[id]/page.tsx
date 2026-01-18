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
    if (ms === DURATION_6_7S) return '6.7S SPRINT';
    if (ms === DURATION_20S) return '20S ENDURANCE';
    if (ms === DURATION_67_REPS) return '67 REPS';
    return `${(ms / 1000).toFixed(1)}S`;
  };

  const formatScore = (score: number, duration: number) => {
    if (is67RepsMode(duration)) {
      return (score / 1000).toFixed(2);
    }
    return score.toLocaleString();
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
        <div className="flex items-center gap-3 text-white/30">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0110 10" />
          </svg>
          <span className="text-sm tracking-wider">LOADING SCORE DATA...</span>
        </div>
      </main>
    );
  }

  if (error || !scoreData) {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
        <div className="bg-bg-secondary border border-white/10 p-8 rounded-2xl text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">SCORE NOT FOUND</h2>
          <p className="text-white/50 mb-6 text-sm">This score may have been removed or the link is invalid.</p>
          <Link 
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-accent-green text-black px-8 py-3 rounded-xl font-bold hover:bg-accent-green/90 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            PLAY 67RANKED
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
        <div className="bg-bg-secondary border border-white/10 rounded-2xl overflow-hidden mb-4">
          {/* Header */}
          <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-white tracking-wide">SCORE CARD</h1>
            <span className="px-3 py-1 bg-accent-green/20 text-accent-green text-xs font-semibold rounded-full tracking-wider">
              {formatDuration(scoreData.duration_ms)}
            </span>
          </div>

          <div className="p-6">
            {/* Player Info */}
            <div className="text-center mb-6">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-1">PLAYER</p>
              <p className="text-2xl font-bold text-white">{scoreData.username}</p>
            </div>

            {/* Score Display */}
            <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-6 text-center mb-6">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
                {is67Reps ? 'TIME' : 'SCORE'}
              </p>
              <p className="text-6xl font-black text-accent-green font-mono">
                {formatScore(scoreData.score, scoreData.duration_ms)}
              </p>
              <p className="text-white/30 text-sm mt-1">
                {is67Reps ? 'seconds' : 'reps'}
              </p>
            </div>

            {/* Stats */}
            {scoreData.rank && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">GLOBAL RANK</p>
                  <p className="text-2xl font-bold text-white">#{scoreData.rank}</p>
                </div>
                {percentile !== null && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">PERCENTILE</p>
                    <p className="text-2xl font-bold text-accent-green">Top {100 - percentile}%</p>
                  </div>
                )}
              </div>
            )}

            {/* Date */}
            <div className="text-center">
              <p className="text-white/20 text-xs">
                {new Date(scoreData.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="w-full bg-accent-green text-black py-4 rounded-xl font-bold text-sm tracking-wide hover:bg-accent-green/90 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            BEAT {scoreData.username.toUpperCase()}&apos;S SCORE
          </Link>

          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 bg-white/5 border border-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              SHARE
            </button>
            <button
              onClick={handleCopyLink}
              className="flex-1 bg-white/5 border border-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>

          <Link
            href="/"
            className="w-full bg-white/5 border border-white/10 text-white/70 py-3 rounded-xl font-semibold hover:bg-white/10 transition-all text-center text-sm"
          >
            BACK TO HOME
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/20 text-xs tracking-wider">67RANKED.COM</p>
        </div>
      </div>
    </main>
  );
}
