'use client';

import { useState, useEffect } from 'react';
import { GameMode, DURATION_6_7S, DURATION_20S, DURATION_67_REPS, MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION } from '@/types/game';

interface ModeSelectorProps {
  onSelect: (mode: GameMode, duration: number) => void;
  onCancel: () => void;
}

export function ModeSelector({ onSelect, onCancel }: ModeSelectorProps) {
  const [mode, setMode] = useState<GameMode>('normal');
  const [duration, setDuration] = useState<number>(DURATION_6_7S);
  const [customSeconds, setCustomSeconds] = useState<string>('10.0');
  const [showCustom, setShowCustom] = useState(false);

  // Load last used settings from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('67ranked_lastMode') as GameMode | null;
    const savedDuration = localStorage.getItem('67ranked_lastDuration');
    if (savedMode) setMode(savedMode);
    if (savedDuration) {
      const d = parseInt(savedDuration, 10);
      setDuration(d);
      if (d !== DURATION_6_7S && d !== DURATION_20S && d !== DURATION_67_REPS) {
        setShowCustom(true);
        setCustomSeconds((d / 1000).toFixed(1));
      }
    }
  }, []);

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

  const handleStart = () => {
    // Save to localStorage
    localStorage.setItem('67ranked_lastMode', mode);
    localStorage.setItem('67ranked_lastDuration', duration.toString());
    onSelect(mode, duration);
  };

  const isValidDuration = duration === DURATION_67_REPS || (duration >= MIN_CUSTOM_DURATION && duration <= MAX_CUSTOM_DURATION);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
      <div className="glass-panel p-6 rounded-2xl max-w-sm w-full mx-4">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          Choose Your Game
        </h2>

        {/* Mode Selection */}
        <div className="mb-6">
          <label className="text-white/70 text-sm mb-2 block">Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {(['normal', 'duel', 'challenge'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`
                  py-3 px-2 rounded-xl text-sm font-semibold transition-all
                  ${mode === m 
                    ? 'bg-accent-green text-black' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                  }
                `}
              >
                {m === 'normal' ? '🎮 Solo' : m === 'duel' ? '⚔️ Duel' : '🎯 Challenge'}
              </button>
            ))}
          </div>
          
          {/* Mode description */}
          <p className="text-white/50 text-xs mt-2 text-center">
            {mode === 'normal' && 'Play solo and compete on the leaderboard'}
            {mode === 'duel' && 'Real-time match: both players play simultaneously'}
            {mode === 'challenge' && 'Async match: play now, opponent plays later'}
          </p>
        </div>

        {/* Duration Selection */}
        <div className="mb-6">
          <label className="text-white/70 text-sm mb-2 block">Game Type</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => handleDurationSelect(DURATION_6_7S)}
              className={`
                py-3 rounded-xl font-semibold transition-all text-sm
                ${duration === DURATION_6_7S && !showCustom
                  ? 'bg-accent-green text-black' 
                  : 'bg-white/10 text-white hover:bg-white/20'
                }
              `}
            >
              <div>6.7s</div>
              <div className="text-xs opacity-70">Sprint</div>
            </button>
            <button
              onClick={() => handleDurationSelect(DURATION_20S)}
              className={`
                py-3 rounded-xl font-semibold transition-all text-sm
                ${duration === DURATION_20S && !showCustom
                  ? 'bg-accent-green text-black' 
                  : 'bg-white/10 text-white hover:bg-white/20'
                }
              `}
            >
              <div>20s</div>
              <div className="text-xs opacity-70">Endurance</div>
            </button>
            <button
              onClick={() => handleDurationSelect(DURATION_67_REPS)}
              className={`
                py-3 rounded-xl font-semibold transition-all text-sm
                ${duration === DURATION_67_REPS
                  ? 'bg-accent-green text-black' 
                  : 'bg-white/10 text-white hover:bg-white/20'
                }
              `}
            >
              <div>67 Reps</div>
              <div className="text-xs opacity-70">Speedrun</div>
            </button>
          </div>
          
          {/* Custom duration toggle */}
          {duration !== DURATION_67_REPS && (
            <button
              onClick={handleCustomToggle}
              className={`
                w-full py-2 rounded-xl font-semibold transition-all text-sm
                ${showCustom
                  ? 'bg-accent-green text-black' 
                  : 'bg-white/10 text-white hover:bg-white/20'
                }
              `}
            >
              Custom Duration
            </button>
          )}

          {/* Custom duration input */}
          {showCustom && (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customSeconds}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  min={MIN_CUSTOM_DURATION / 1000}
                  max={MAX_CUSTOM_DURATION / 1000}
                  step="0.1"
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-center font-mono focus:outline-none focus:border-accent-green"
                />
                <span className="text-white/70">seconds</span>
              </div>
              <p className="text-white/40 text-xs mt-1">
                5-120 seconds (step 0.1s)
              </p>
            </div>
          )}
          
          {/* Leaderboard eligibility note */}
          {mode === 'normal' && showCustom && (
            <p className="text-yellow-400/70 text-xs mt-2">
              ⚠️ Custom durations don&apos;t qualify for the leaderboard
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!isValidDuration}
            className={`
              flex-1 py-3 rounded-xl font-semibold transition-all
              ${isValidDuration 
                ? 'bg-accent-green text-black hover:bg-accent-green/90' 
                : 'bg-white/10 text-white/50 cursor-not-allowed'
              }
            `}
          >
            Start →
          </button>
        </div>
      </div>
    </div>
  );
}
