// Professional SVG Icons for 67Ranked

interface IconProps {
  className?: string;
  size?: number;
}

export function PlayIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function SwordsIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
      <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
      <path d="M11 5l-6 6" />
      <path d="M8 8L4 4" />
      <path d="M5 3L3 5" />
    </svg>
  );
}

export function TrophyIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15a7 7 0 0 0 7-7V4H5v4a7 7 0 0 0 7 7z" />
      <path d="M5 4H3a1 1 0 0 0-1 1v2a4 4 0 0 0 4 4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M19 4h2a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 15v3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor" />
    </svg>
  );
}

export function CrownIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 20h20v-2H2v2zm2-4h16l-2-9-4.5 4.5L12 7l-1.5 4.5L6 7l-2 9z" />
    </svg>
  );
}

export function MedalIcon({ className = '', size = 20, variant = 'gold' }: IconProps & { variant?: 'gold' | 'silver' | 'bronze' }) {
  const colors = {
    gold: { primary: '#FFD700', secondary: '#FFA500' },
    silver: { primary: '#C0C0C0', secondary: '#A0A0A0' },
    bronze: { primary: '#CD7F32', secondary: '#8B4513' }
  };
  const { primary, secondary } = colors[variant];
  
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="14" r="7" fill={primary} />
      <circle cx="12" cy="14" r="5" fill={secondary} />
      <text x="12" y="17" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">
        {variant === 'gold' ? '1' : variant === 'silver' ? '2' : '3'}
      </text>
      <path d="M8 2l2 6h4l2-6" fill={primary} />
    </svg>
  );
}

export function RefreshIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}

export function HomeIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function ShareIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function UsersIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function GamepadIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <circle cx="18" cy="11" r="1" fill="currentColor" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  );
}

export function EqualsIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="5" y1="9" x2="19" y2="9" />
      <line x1="5" y1="15" x2="19" y2="15" />
    </svg>
  );
}

export function CheckCircleIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function TimerIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function FlameIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.53 2.04-6.71 5.22-8.21.46-.22 1.02.12 1.05.63.03.57.22 1.12.58 1.58.6.78 1.54 1.18 2.5 1.18-.04-.71.21-1.4.67-1.93.47-.53 1.12-.88 1.83-.98.63-.09 1.12.54.96 1.14-.11.41-.02.86.25 1.19.35.43.89.7 1.46.7.31 0 .61-.08.87-.22.37-.2.84-.04 1.01.35C19.78 10.29 21 12.54 21 15c0 4.97-4.03 9-9 9z" />
    </svg>
  );
}

export function TargetIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
