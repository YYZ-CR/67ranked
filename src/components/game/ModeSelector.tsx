'use client';

import { useState, useEffect } from 'react';
import { GameMode, DURATION_6_7S, DURATION_20S, DURATION_67_REPS, MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION } from '@/types/game';

interface ModeSelectorProps {
  onSelect: (mode: GameMode, duration: number) => void;
  onCancel: () => void;
}

// Icons
const BoltIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
  </svg>
);

const TimerIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2" strokeLinecap="round" />
    <path d="M9 2h6" strokeLinecap="round" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

const CustomIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" strokeLinecap="round" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
  </svg>
);

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

  const modes = [
    { 
      id: DURATION_6_7S, 
      title: '6.7s Sprint', 
      desc: 'Maximum reps in 6.7 seconds. Pure speed.', 
      tag: 'FASTEST',
      icon: BoltIcon 
    },
    { 
      id: DURATION_20S, 
      title: '20s Endurance', 
      desc: 'Maintain tempo over time. Consistency wins.', 
      tag: 'STAMINA',
      icon: TimerIcon 
    },
    { 
      id: DURATION_67_REPS, 
      title: '67 Reps', 
      desc: 'Race to complete 67 reps. Best time wins.', 
      tag: 'PRECISION',
      icon: TargetIcon 
    },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 z-50 animate-fade-in">
      <div className="glass-panel rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 pb-4 text-center border-b border-white/5">
          <h2 className="text-2xl font-bold text-white tracking-tight">SELECT MODE</h2>
          
          {/* Mode toggle */}
          <div className="flex justify-center mt-4">
            <div className="inline-flex bg-white/5 rounded-full p-1">
              <button
                onClick={() => setMode('normal')}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                  mode === 'normal' 
                    ? 'bg-accent-green text-black' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                SOLO
              </button>
              <button
                onClick={() => setMode('duel')}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                  mode === 'duel' 
                    ? 'bg-accent-green text-black' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                DUEL
              </button>
            </div>
          </div>
        </div>

        {/* Duration Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {modes.map(({ id, title, desc, tag, icon: Icon }) => {
              const isSelected = duration === id && !showCustom;
              return (
                <button
                  key={id}
                  onClick={() => handleDurationSelect(id)}
                  className={`relative p-5 rounded-xl text-left transition-all ${
                    isSelected 
                      ? 'card-selected' 
                      : 'card hover:border-white/20'
                  }`}
                >
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-accent-green rounded-full flex items-center justify-center">
                      <CheckIcon />
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                    isSelected ? 'bg-accent-green/20 text-accent-green' : 'bg-white/5 text-white/40'
                  }`}>
                    <Icon />
                  </div>
                  
                  {/* Content */}
                  <h3 className={`text-lg font-bold mb-1 ${isSelected ? 'text-white' : 'text-white/90'}`}>
                    {title}
                  </h3>
                  <p className="text-sm text-white/50 mb-4 line-clamp-2">
                    {desc}
                  </p>
                  
                  {/* Tag */}
                  <div className="divider mb-3"></div>
                  <span className={`text-xs font-semibold tracking-wider ${
                    isSelected ? 'text-accent-green' : 'text-white/30'
                  }`}>
                    {tag}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Duration */}
          {duration !== DURATION_67_REPS && (
            <div className="mt-4">
              <button
                onClick={handleCustomToggle}
                className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 ${
                  showCustom ? 'card-selected' : 'card hover:border-white/20'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  showCustom ? 'bg-accent-green/20 text-accent-green' : 'bg-white/5 text-white/40'
                }`}>
                  <CustomIcon />
                </div>
                <div className="flex-1">
                  <span className={`font-semibold ${showCustom ? 'text-white' : 'text-white/70'}`}>
                    Custom Duration
                  </span>
                  <span className="text-white/40 text-sm ml-2">5-120 seconds</span>
                </div>
                {showCustom && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customSeconds}
                      onChange={(e) => handleCustomChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      min={5}
                      max={120}
                      step="0.1"
                      className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-center font-mono text-sm"
                    />
                    <span className="text-white/50 text-sm">sec</span>
                  </div>
                )}
              </button>
              
              {mode === 'normal' && showCustom && (
                <p className="text-white/40 text-xs mt-2 px-1">
                  Custom durations are not ranked on the leaderboard
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-2 flex items-center justify-between border-t border-white/5">
          <button
            onClick={onCancel}
            className="btn-secondary text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
            CANCEL
          </button>
          <button
            onClick={handleStart}
            disabled={!isValidDuration}
            className={`btn-primary text-sm ${!isValidDuration ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            START GAME
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
