'use client';

import { useState, useEffect } from 'react';
import { GameMode, DURATION_6_7S, DURATION_20S, DURATION_67_REPS, MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION } from '@/types/game';

interface ModeSelectorProps {
  onSelect: (mode: GameMode, duration: number) => void;
  onCancel: () => void;
}

// Icons
const BoltIcon = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
  </svg>
);

const TimerIcon = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2" strokeLinecap="round" />
    <path d="M9 2h6" strokeLinecap="round" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

const CustomIcon = () => (
  <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" strokeLinecap="round" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 24 24" fill="currentColor">
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
    { id: DURATION_6_7S, title: '6.7s', subtitle: 'Sprint', tag: 'SPEED', icon: BoltIcon },
    { id: DURATION_20S, title: '20s', subtitle: 'Endurance', tag: 'STAMINA', icon: TimerIcon },
    { id: DURATION_67_REPS, title: '67', subtitle: 'Reps', tag: 'RACE', icon: TargetIcon },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-3 z-50 animate-fade-in">
      <div className="glass-panel rounded-xl sm:rounded-2xl w-full max-w-sm sm:max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-3 sm:p-4 pb-2 sm:pb-3 text-center border-b border-white/5">
          <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">SELECT MODE</h2>
          
          {/* Mode toggle */}
          <div className="flex justify-center mt-2 sm:mt-3">
            <div className="inline-flex bg-white/5 rounded-full p-0.5 sm:p-1">
              <button
                onClick={() => setMode('normal')}
                className={`px-4 sm:px-5 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  mode === 'normal' 
                    ? 'bg-accent-green text-black' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                SOLO
              </button>
              <button
                onClick={() => setMode('duel')}
                className={`px-4 sm:px-5 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
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
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {modes.map(({ id, title, subtitle, tag, icon: Icon }) => {
              const isSelected = duration === id && !showCustom;
              return (
                <button
                  key={id}
                  onClick={() => handleDurationSelect(id)}
                  className={`relative p-2 sm:p-3 rounded-lg sm:rounded-xl text-center transition-all ${
                    isSelected ? 'card-selected' : 'card hover:border-white/20'
                  }`}
                >
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-accent-green rounded-full flex items-center justify-center">
                      <CheckIcon />
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-md sm:rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 ${
                    isSelected ? 'bg-accent-green/20 text-accent-green' : 'bg-white/5 text-white/40'
                  }`}>
                    <Icon />
                  </div>
                  
                  {/* Content */}
                  <p className={`text-base sm:text-lg font-bold ${isSelected ? 'text-white' : 'text-white/90'}`}>
                    {title}
                  </p>
                  <p className={`text-[10px] sm:text-xs ${isSelected ? 'text-white/70' : 'text-white/50'}`}>
                    {subtitle}
                  </p>
                  
                  {/* Tag */}
                  <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-white/5">
                    <span className={`text-[9px] sm:text-[10px] font-semibold tracking-wider ${
                      isSelected ? 'text-accent-green' : 'text-white/30'
                    }`}>
                      {tag}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Duration */}
          {duration !== DURATION_67_REPS && (
            <div className="mt-2 sm:mt-3">
              <button
                onClick={handleCustomToggle}
                className={`w-full p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-left transition-all flex items-center gap-2 sm:gap-3 ${
                  showCustom ? 'card-selected' : 'card hover:border-white/20'
                }`}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0 ${
                  showCustom ? 'bg-accent-green/20 text-accent-green' : 'bg-white/5 text-white/40'
                }`}>
                  <CustomIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-semibold text-xs sm:text-sm ${showCustom ? 'text-white' : 'text-white/70'}`}>
                    Custom
                  </span>
                  <span className="text-white/40 text-[10px] sm:text-xs ml-1">5-120s</span>
                </div>
                {showCustom && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="number"
                      value={customSeconds}
                      onChange={(e) => handleCustomChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      min={5}
                      max={120}
                      step="0.1"
                      className="w-14 sm:w-16 bg-white/10 border border-white/20 rounded-md sm:rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 text-white text-center font-mono text-xs sm:text-sm"
                    />
                    <span className="text-white/50 text-[10px] sm:text-xs">s</span>
                  </div>
                )}
              </button>
              
              {mode === 'normal' && showCustom && (
                <p className="text-white/40 text-[10px] sm:text-xs mt-1 px-1">
                  Not ranked on leaderboard
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 pt-2 flex items-center justify-between gap-2 border-t border-white/5">
          <button
            onClick={onCancel}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!isValidDuration}
            className={`btn-primary text-xs sm:text-sm py-2 sm:py-2.5 px-4 sm:px-6 ${!isValidDuration ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Start
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
