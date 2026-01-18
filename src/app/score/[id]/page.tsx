'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, is67RepsMode } from '@/types/game';
import { Header } from '@/components/ui/Header';

interface ScoreData {
  id: string;
  username: string;
  score: number;
  duration_ms: number;
  created_at: string;
  rank?: number;
  totalPlayers?: number;
}

// Icons
const PlayIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const BoltIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
  </svg>
);

const TimerIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="13" r="7" />
    <path d="M12 10v3l1.5 1.5" strokeLinecap="round" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

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
        if (!response.ok) throw new Error('Score not found');
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
    if (ms === DURATION_67_REPS) return '67 Reps';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatScore = (score: number, duration: number) => {
    if (is67RepsMode(duration)) return (score / 1000).toFixed(2);
    return score.toString();
  };

  const getShareText = () => {
    if (!scoreData) return '';
    const is67Reps = is67RepsMode(scoreData.duration_ms);
    if (is67Reps) {
      return `${scoreData.username} got 67 reps in ${(scoreData.score / 1000).toFixed(2)}s on 67ranked.com. Can you beat that?`;
    }
    return `${scoreData.username} scored ${scoreData.score} reps on 67ranked.com. Can you beat that?`;
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = getShareText();

    if (navigator.share) {
      try {
        await navigator.share({ title: '67Ranked', text: shareText, url: shareUrl });
      } catch { /* cancelled */ }
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
      <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial flex items-center justify-center">
        <div className="flex items-center gap-2 text-white/40">
          <div className="w-4 h-4 border-2 border-white/20 border-t-accent-green rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </main>
    );
  }

  if (error || !scoreData) {
    return (
      <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
        <Header />
        <div className="min-h-screen flex items-center justify-center p-4 pt-20">
          <div className="glass-panel p-8 rounded-2xl text-center max-w-md animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <TargetIcon />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Score Not Found</h2>
            <p className="text-white/50 mb-6">This score may have been removed or the link is invalid.</p>
            <Link href="/" className="btn-primary w-full">
              <PlayIcon />
              Play 67Ranked
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const is67Reps = is67RepsMode(scoreData.duration_ms);
  const percentile = scoreData.rank && scoreData.totalPlayers 
    ? Math.round((1 - (scoreData.rank / scoreData.totalPlayers)) * 100)
    : null;

  const getModeIcon = () => {
    if (scoreData.duration_ms === DURATION_6_7S) return <BoltIcon />;
    if (scoreData.duration_ms === DURATION_20S) return <TimerIcon />;
    if (scoreData.duration_ms === DURATION_67_REPS) return <TargetIcon />;
    return <TimerIcon />;
  };

  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
      <Header />
      
      <div className="min-h-screen flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-lg animate-fade-in">
          {/* Score Card */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getModeIcon()}
                <span className="text-xs text-accent-green font-medium">
                  {formatDuration(scoreData.duration_ms)}
                </span>
              </div>
              <span className="text-xs text-white/30">
                {new Date(scoreData.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>

            {/* Main score display */}
            <div className="p-8 lg:p-10 text-center">
              {/* Username */}
              <p className="text-label mb-2">{scoreData.username}</p>
              
              {/* Score */}
              <div className="mb-4">
                <span className="score-display text-7xl lg:text-8xl text-accent-green">
                  {formatScore(scoreData.score, scoreData.duration_ms)}
                </span>
                <span className="text-2xl text-white/30 ml-2">
                  {is67Reps ? 's' : 'reps'}
                </span>
              </div>

              {/* Rank info */}
              {scoreData.rank && (
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-full">
                  <span className="text-white/40 text-sm">Global Rank</span>
                  <span className="text-white font-bold">#{scoreData.rank}</span>
                  {percentile !== null && (
                    <>
                      <span className="w-px h-4 bg-white/10"></span>
                      <span className="text-accent-green text-sm font-semibold">Top {100 - percentile}%</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="divider"></div>

            {/* Actions */}
            <div className="p-6 space-y-2">
              {/* Primary CTA */}
              <Link href="/" className="btn-primary w-full text-lg py-4">
                <PlayIcon />
                Beat {scoreData.username}&apos;s Score
              </Link>

              {/* Secondary actions */}
              <div className="flex gap-2">
                <button onClick={handleShare} className="btn-secondary flex-1">
                  <ShareIcon />
                  Share
                </button>
                <button onClick={handleCopyLink} className="btn-secondary flex-1">
                  <CopyIcon />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              <Link href="/" className="btn-secondary w-full">
                <HomeIcon />
                Home
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-4">
            <p className="text-white/20 text-xs">67ranked.com</p>
          </div>
        </div>
      </div>
    </main>
  );
}
