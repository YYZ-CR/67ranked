'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DURATION_6_7S, DURATION_20S, DURATION_67_REPS, MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION, is67RepsMode } from '@/types/game';

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

  const getDurationLabel = (ms: number) => {
    if (ms === DURATION_6_7S) return 'SPRINT';
    if (ms === DURATION_20S) return 'ENDURANCE';
    if (is67RepsMode(ms)) return 'REPS';
    return 'CUSTOM';
  };

  return (
    <main className="min-h-screen bg-bg-primary bg-grid-pattern flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-white/10 rounded-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-white/50 hover:text-white text-sm flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            BACK TO HOME
          </button>
          <div className="flex items-center gap-2 text-accent-green text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
            SYSTEM ONLINE
          </div>
        </div>

        <div className="p-8">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white italic tracking-tight mb-2">
              CREATE A DUEL
            </h1>
            <p className="text-white/30 text-sm tracking-wider">
              INITIALIZATION PROTOCOL 67.4
            </p>
          </div>

          {/* Username Input */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent-green/50"></span>
              <span className="text-white/50 text-xs uppercase tracking-wider">OPERATOR IDENTIFICATION</span>
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ENTER YOUR CODENAME (E.G. NEO_67)"
              maxLength={20}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-white font-mono placeholder:text-white/20 focus:border-accent-green transition-colors"
            />
          </div>

          {/* Duration Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-accent-green/50"></span>
              <span className="text-white/50 text-xs uppercase tracking-wider">SELECT DUEL PROTOCOL</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleDurationSelect(DURATION_6_7S)}
                className={`
                  py-4 rounded-lg border transition-all flex flex-col items-center gap-1
                  ${duration === DURATION_6_7S && !showCustom
                    ? 'bg-accent-green/10 border-accent-green text-accent-green'
                    : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                  }
                `}
              >
                <span className="text-xl font-bold">6.7<span className="text-sm">s</span></span>
                <span className="text-xs tracking-wider opacity-60">SPRINT</span>
              </button>
              <button
                onClick={() => handleDurationSelect(DURATION_20S)}
                className={`
                  py-4 rounded-lg border transition-all flex flex-col items-center gap-1
                  ${duration === DURATION_20S && !showCustom
                    ? 'bg-accent-green/10 border-accent-green text-accent-green'
                    : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                  }
                `}
              >
                <span className="text-xl font-bold">20<span className="text-sm">s</span></span>
                <span className="text-xs tracking-wider opacity-60">ENDURANCE</span>
              </button>
              <button
                onClick={() => handleDurationSelect(DURATION_67_REPS)}
                className={`
                  py-4 rounded-lg border transition-all flex flex-col items-center gap-1
                  ${is67RepsMode(duration) && !showCustom
                    ? 'bg-accent-green/10 border-accent-green text-accent-green'
                    : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                  }
                `}
              >
                <span className="text-xl font-bold">67</span>
                <span className="text-xs tracking-wider opacity-60">REPS</span>
              </button>
              <button
                onClick={handleCustomToggle}
                className={`
                  py-4 rounded-lg border transition-all flex flex-col items-center gap-1
                  ${showCustom
                    ? 'bg-accent-green/10 border-accent-green text-accent-green'
                    : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                  }
                `}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M1 12h4M19 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span className="text-xs tracking-wider opacity-60">CUSTOM</span>
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
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-center font-mono focus:border-accent-green transition-colors"
                />
                <span className="text-white/50 text-sm">seconds</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={isCreating || !username.trim()}
            className={`
              w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-3
              ${isCreating || !username.trim()
                ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                : 'bg-accent-green text-black hover:bg-accent-green/90'
              }
            `}
          >
            {isCreating ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0110 10" />
                </svg>
                INITIALIZING...
              </>
            ) : (
              <>
                CREATE DUEL PROTOCOL
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/>
                </svg>
              </>
            )}
          </button>

          {/* Info */}
          <div className="mt-4 p-3 bg-white/5 border border-white/5 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-white/30 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <p className="text-white/30 text-xs leading-relaxed">
              UPON INITIALIZATION, A HIGH-SECURITY ACCESS LINK WILL BE GENERATED. DISPATCH THIS LINK TO YOUR OPPONENT TO BEGIN THE SYNCHRONIZATION.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-white/20 text-xs">
          <span>STATUS: AWAITING OPERATOR INPUT</span>
          <span>VERSION 1.0.67-BETA</span>
        </div>
      </div>
    </main>
  );
}
