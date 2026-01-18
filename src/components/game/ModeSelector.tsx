'use client';

import { useState, useEffect } from 'react';
import { GameMode, DURATION_6_7S, DURATION_20S, DURATION_67_REPS, MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION } from '@/types/game';

interface ModeSelectorProps {
  onSelect: (mode: GameMode, duration: number) => void;
  onCancel: () => void;
}

// Mode card data
const DURATION_CARDS = [
  {
    duration: DURATION_6_7S,
    title: '6.7s Sprint',
    description: 'Maximum reps in 6.7 seconds. Every millisecond counts.',
    category: 'SPEED',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/>
      </svg>
    ),
  },
  {
    duration: DURATION_20S,
    title: '20s Endurance',
    description: 'Sustained output over time. Maintain your tempo.',
    category: 'STAMINA',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    duration: DURATION_67_REPS,
    title: '67 Reps',
    description: 'Race to complete 67 reps. Fastest time wins.',
    category: 'PRECISION',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

export function ModeSelector({ onSelect, onCancel }: ModeSelectorProps) {
  const [mode, setMode] = useState<GameMode>('normal');
  const [duration, setDuration] = useState<number>(DURATION_6_7S);
  const [customSeconds, setCustomSeconds] = useState<string>('10.0');
  const [showCustom, setShowCustom] = useState(false);

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
    localStorage.setItem('67ranked_lastMode', mode);
    localStorage.setItem('67ranked_lastDuration', duration.toString());
    onSelect(mode, duration);
  };

  const isValidDuration = duration === DURATION_67_REPS || (duration >= MIN_CUSTOM_DURATION && duration <= MAX_CUSTOM_DURATION);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-bg-secondary border border-white/10 rounded-2xl p-8 max-w-3xl w-full mx-4 animate-scale-in">
        {/* Header */}
        <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-wide">
          SELECT MODE
        </h2>
        
        {/* Solo/Duel Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/5 rounded-full p-1">
            <button
              onClick={() => setMode('normal')}
              className={`
                px-8 py-2 rounded-full text-sm font-semibold transition-all
                ${mode === 'normal' 
                  ? 'bg-accent-green text-black' 
                  : 'text-white/60 hover:text-white'
                }
              `}
            >
              SOLO
            </button>
            <button
              onClick={() => setMode('duel')}
              className={`
                px-8 py-2 rounded-full text-sm font-semibold transition-all
                ${mode === 'duel' 
                  ? 'bg-accent-green text-black' 
                  : 'text-white/60 hover:text-white'
                }
              `}
            >
              DUEL
            </button>
          </div>
        </div>

        {/* Duration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {DURATION_CARDS.map((card) => {
            const isSelected = duration === card.duration && !showCustom;
            return (
              <button
                key={card.duration}
                onClick={() => handleDurationSelect(card.duration)}
                className={`
                  relative p-5 rounded-xl border transition-all text-left
                  ${isSelected 
                    ? 'bg-accent-green/10 border-accent-green' 
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                  }
                `}
              >
                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-accent-green rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
                
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                  isSelected ? 'bg-accent-green/20 text-accent-green' : 'bg-white/10 text-white/60'
                }`}>
                  {card.icon}
                </div>
                
                {/* Title */}
                <h3 className={`text-lg font-bold mb-2 ${isSelected ? 'text-white' : 'text-white/90'}`}>
                  {card.title}
                </h3>
                
                {/* Description */}
                <p className="text-white/50 text-sm mb-4 leading-relaxed">
                  {card.description}
                </p>
                
                {/* Category Label */}
                <div className={`text-xs font-semibold tracking-wider ${
                  isSelected ? 'text-accent-green' : 'text-white/30'
                }`}>
                  {card.category}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Duration */}
        {!showCustom ? (
          <button
            onClick={handleCustomToggle}
            className="w-full py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/30 hover:text-white/70 transition-all mb-6"
          >
            + Custom Duration
          </button>
        ) : (
          <div className="mb-6 p-4 rounded-xl border border-accent-green bg-accent-green/5">
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-sm uppercase tracking-wider">Duration:</span>
              <input
                type="number"
                value={customSeconds}
                onChange={(e) => handleCustomChange(e.target.value)}
                min={MIN_CUSTOM_DURATION / 1000}
                max={MAX_CUSTOM_DURATION / 1000}
                step="0.1"
                className="flex-1 bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white text-center font-mono focus:border-accent-green"
              />
              <span className="text-white/50 text-sm">seconds</span>
              <button 
                onClick={() => setShowCustom(false)}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {mode === 'normal' && (
              <p className="text-white/30 text-xs mt-2">Custom durations are unranked</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            CANCEL
          </button>
          <button
            onClick={handleStart}
            disabled={!isValidDuration}
            className={`
              px-8 py-3 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center gap-2
              ${isValidDuration 
                ? 'bg-accent-green text-black hover:bg-accent-green/90' 
                : 'bg-white/10 text-white/30 cursor-not-allowed'
              }
            `}
          >
            START GAME
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
