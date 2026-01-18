'use client';

import { forwardRef } from 'react';

interface CameraFeedProps {
  size?: number;
  className?: string;
}

export const CameraFeed = forwardRef<
  { video: HTMLVideoElement | null; canvas: HTMLCanvasElement | null },
  CameraFeedProps
>(function CameraFeed({ size = 400, className = '' }, ref) {
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-black ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Hidden video element for MediaPipe input */}
      <video
        ref={(el) => {
          if (ref && typeof ref === 'object' && ref !== null) {
            ref.current = { ...ref.current, video: el } as typeof ref.current;
          }
        }}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover opacity-0"
        style={{ transform: 'scaleX(-1)' }}
      />
      
      {/* Canvas for rendering with hand tracking overlay */}
      <canvas
        ref={(el) => {
          if (ref && typeof ref === 'object' && ref !== null) {
            ref.current = { ...ref.current, canvas: el } as typeof ref.current;
          }
        }}
        width={size}
        height={size}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
});
