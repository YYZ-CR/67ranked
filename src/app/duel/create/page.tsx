'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION, is67RepsMode } from '@/types/game';
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

  const protocols = [
    { id: DURATION_6_7S, title: '6.7s', subtitle: 'Sprint', icon: BoltIcon },
    { id: DURATION_20S, title: '20s', subtitle: 'Endurance', icon: TimerIcon },
    { id: DURATION_67_REPS, title: '67', subtitle: 'Reps', icon: TargetIcon },
  ];

  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern bg-gradient-radial">
      <Header />
      
      <div className="min-h-screen flex items-center justify-center p-4 pt-20">
        <div className="glass-panel rounded-2xl w-full max-w-lg animate-fade-in">
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="text-white/40 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              <ArrowLeftIcon />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-1.5">
              <span className="status-dot"></span>
              <span className="text-xs font-mono text-accent-green uppercase tracking-wider">System Online</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 lg:p-8">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-2" style={{ fontStyle: 'italic' }}>
                CREATE A DUEL
              </h1>
              <p className="text-white/30 text-xs font-mono uppercase tracking-wider">
                Initialization Protocol 67.4
              </p>
            </div>

            {/* Username */}
            <div className="mb-8">
              <label className="text-label block mb-2">
                <span className="status-dot inline-block mr-1.5"></span>
                Operator Identification
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your codename (e.g. NEO_67)"
                maxLength={20}
                className="w-full rounded-lg px-4 py-4 text-white placeholder:text-white/20 font-mono uppercase tracking-wider"
              />
            </div>

            {/* Protocol Selection */}
            <div className="mb-8">
              <label className="text-label block mb-3">
                <span className="status-dot inline-block mr-1.5"></span>
                Select Duel Protocol
              </label>
              <div className="grid grid-cols-4 gap-2">
                {protocols.map(({ id, title, subtitle, icon: Icon }) => {
                  const isSelected = duration === id && !showCustom;
                  return (
                    <button
                      key={id}
                      onClick={() => handleDurationSelect(id)}
                      className={`p-4 rounded-xl text-center transition-all ${
                        isSelected ? 'card-selected' : 'card'
                      }`}
                    >
                      <div className={`w-full flex justify-center mb-2 ${isSelected ? 'text-accent-green' : 'text-white/40'}`}>
                        <Icon />
                      </div>
                      <p className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-white/70'}`}>{title}</p>
                      <p className="text-xs text-white/30 uppercase tracking-wider">{subtitle}</p>
                    </button>
                  );
                })}
                <button
                  onClick={handleCustomToggle}
                  className={`p-4 rounded-xl text-center transition-all ${
                    showCustom ? 'card-selected' : 'card'
                  }`}
                >
                  <div className={`w-full flex justify-center mb-2 ${showCustom ? 'text-accent-green' : 'text-white/40'}`}>
                    <CustomIcon />
                  </div>
                  <p className={`text-lg font-bold ${showCustom ? 'text-white' : 'text-white/70'}`}>Custom</p>
                  <p className="text-xs text-white/30 uppercase tracking-wider">5-120s</p>
                </button>
              </div>

              {showCustom && (
                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="number"
                    value={customSeconds}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    min={5}
                    max={120}
                    step="0.1"
                    className="flex-1 rounded-lg px-4 py-3 text-white text-center font-mono"
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
              className={`btn-primary w-full text-lg py-5 ${(isCreating || !username.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isCreating ? 'Initializing...' : 'Create Duel Protocol'}
              {!isCreating && (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
                </svg>
              )}
            </button>

            {/* Info */}
            <div className="mt-6 p-4 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-white/30 text-xs flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
                </svg>
                <span>
                  Upon initialization, a high-security access link will be generated. 
                  Dispatch this link to your opponent to begin the synchronization.
                </span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-white/20 font-mono uppercase tracking-wider">Status: Awaiting Operator Input</span>
            <span className="text-xs text-white/20 font-mono">v1.0.67-beta</span>
          </div>
        </div>
      </div>
    </main>
  );
}
