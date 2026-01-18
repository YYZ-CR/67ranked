'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION } from '@/types/game';
import { Header } from '@/components/ui/Header';

// Icons
const BoltIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
  </svg>
);

const TimerIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="13" r="7" />
    <path d="M12 10v3l1.5 1.5" strokeLinecap="round" />
    <path d="M10 2h4" strokeLinecap="round" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

const CustomIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" strokeLinecap="round" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function CreateDuelPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [duration, setDuration] = useState<number>(DURATION_6_7S);
  const [customSeconds, setCustomSeconds] = useState('10.0');
  const [showCustom, setShowCustom] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDurationSelect = (ms: number) => {
    setDuration(ms);
    setShowCustom(false);
  };

  const handleCustomToggle = () => {
    setShowCustom(true);
    const seconds = parseFloat(customSeconds) || 10;
    setDuration(Math.round(seconds * 1000));
  };

  const handleCustomChange = (value: string) => {
    setCustomSeconds(value);
    const seconds = parseFloat(value) || 0;
    const ms = Math.round(seconds * 1000);
    if (ms >= MIN_CUSTOM_DURATION && ms <= MAX_CUSTOM_DURATION) {
      setDuration(ms);
    }
  };

  const handleCreate = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/duel/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          duration_ms: duration
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create duel');
      }

      const data = await response.json();
      sessionStorage.setItem(`duel_${data.duelId}_player_key`, data.player_key);
      router.push(`/duel/${data.duelId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create duel');
      setIsCreating(false);
    }
  };

  const modes = [
    { id: DURATION_6_7S, title: '6.7s', subtitle: 'Sprint', icon: BoltIcon },
    { id: DURATION_20S, title: '20s', subtitle: 'Endurance', icon: TimerIcon },
    { id: DURATION_67_REPS, title: '67', subtitle: 'Reps', icon: TargetIcon },
  ];

  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
      <Header />
      
      <div className="min-h-screen flex items-center justify-center p-4 pt-16">
        <div className="glass-panel rounded-2xl w-full max-w-md animate-fade-in">
          {/* Header */}
          <div className="p-4 border-b border-white/5">
            <button
              onClick={() => router.push('/')}
              className="text-white/40 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              <ArrowLeftIcon />
              <span>Back</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-6">
              Create a Duel
            </h1>

            {/* Username */}
            <div className="mb-5">
              <label className="text-xs text-white/50 block mb-1.5">Your name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full rounded-lg px-4 py-3 text-white placeholder:text-white/30"
              />
            </div>

            {/* Mode Selection */}
            <div className="mb-5">
              <label className="text-xs text-white/50 block mb-2">Mode</label>
              <div className="grid grid-cols-4 gap-2">
                {modes.map(({ id, title, subtitle, icon: Icon }) => {
                  const isSelected = duration === id && !showCustom;
                  return (
                    <button
                      key={id}
                      onClick={() => handleDurationSelect(id)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        isSelected ? 'card-selected' : 'card'
                      }`}
                    >
                      <div className={`w-full flex justify-center mb-1.5 ${isSelected ? 'text-accent-green' : 'text-white/40'}`}>
                        <Icon />
                      </div>
                      <p className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-white/70'}`}>{title}</p>
                      <p className="text-[10px] text-white/40">{subtitle}</p>
                    </button>
                  );
                })}
                <button
                  onClick={handleCustomToggle}
                  className={`p-3 rounded-xl text-center transition-all ${
                    showCustom ? 'card-selected' : 'card'
                  }`}
                >
                  <div className={`w-full flex justify-center mb-1.5 ${showCustom ? 'text-accent-green' : 'text-white/40'}`}>
                    <CustomIcon />
                  </div>
                  <p className={`text-base font-bold ${showCustom ? 'text-white' : 'text-white/70'}`}>Custom</p>
                  <p className="text-[10px] text-white/40">5-120s</p>
                </button>
              </div>

              {showCustom && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    value={customSeconds}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    min={5}
                    max={120}
                    step="0.1"
                    className="flex-1 rounded-lg px-4 py-2.5 text-white text-center font-mono"
                  />
                  <span className="text-white/40 text-sm">seconds</span>
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center mb-4">{error}</p>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={isCreating || !username.trim()}
              className={`btn-primary w-full py-3.5 ${(isCreating || !username.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isCreating ? 'Creating...' : 'Create Duel'}
            </button>

            {/* Info */}
            <p className="text-white/30 text-xs text-center mt-4">
              You&apos;ll get a link to share with your opponent
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
