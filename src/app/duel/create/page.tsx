'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION, is67RepsMode } from '@/types/game';
import { SwordsIcon, FlameIcon, TimerIcon, TargetIcon, HomeIcon } from '@/components/ui/Icons';

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
      
      // Store player key in session storage
      sessionStorage.setItem(`duel_${data.duelId}_player_key`, data.player_key);
      
      // Redirect to duel lobby
      router.push(`/duel/${data.duelId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create duel');
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
      <div className="glass-panel p-6 rounded-2xl max-w-md w-full">
        <button
          onClick={() => router.push('/')}
          className="text-white/50 hover:text-white mb-4 text-sm flex items-center gap-1"
        >
          <HomeIcon size={14} />
          Back to Home
        </button>

        <h1 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
          <SwordsIcon size={24} />
          Create a Duel
        </h1>

        {/* Username input */}
        <div className="mb-6">
          <label className="text-white/70 text-sm mb-2 block">Your Name</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent-green"
          />
        </div>

        {/* Duration Selection */}
        <div className="mb-6">
          <label className="text-white/70 text-sm mb-2 block uppercase tracking-wider text-xs">Mode</label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => handleDurationSelect(DURATION_6_7S)}
              className={`py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                duration === DURATION_6_7S && !showCustom
                  ? 'bg-accent-green text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <FlameIcon size={16} />
              6.7s
            </button>
            <button
              onClick={() => handleDurationSelect(DURATION_20S)}
              className={`py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                duration === DURATION_20S && !showCustom
                  ? 'bg-accent-green text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <TimerIcon size={16} />
              20s
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDurationSelect(DURATION_67_REPS)}
              className={`py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                is67RepsMode(duration) && !showCustom
                  ? 'bg-accent-green text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <TargetIcon size={16} />
              67 Reps
            </button>
            <button
              onClick={handleCustomToggle}
              className={`py-3 rounded-xl font-semibold transition-all ${
                showCustom
                  ? 'bg-accent-green text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Custom
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
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-center font-mono focus:outline-none focus:border-accent-green"
              />
              <span className="text-white/70">seconds</span>
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={isCreating || !username.trim()}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            isCreating || !username.trim()
              ? 'bg-white/10 text-white/50 cursor-not-allowed'
              : 'bg-accent-green text-black hover:bg-accent-green/90'
          }`}
        >
          {isCreating ? 'Creating...' : 'Create Duel'}
        </button>

        <p className="text-white/40 text-xs text-center mt-4">
          You&apos;ll get a link to share with your opponent
        </p>
      </div>
    </main>
  );
}
