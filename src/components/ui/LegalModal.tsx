'use client';

import { useEffect, useRef, useCallback } from 'react';

interface LegalModalProps {
  open: boolean;
  activeDoc: 'terms' | 'privacy';
  onDocChange: (doc: 'terms' | 'privacy') => void;
  onClose: () => void;
  children: React.ReactNode;
}

const CloseIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function LegalModal({ open, activeDoc, onDocChange, onClose, children }: LegalModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle ESC key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Lock body scroll and manage focus
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
      
      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Modal Panel */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5">
          {/* Toggle */}
          <div className="flex items-center bg-black/50 rounded-full p-0.5 border border-white/10">
            <button
              onClick={() => onDocChange('terms')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                activeDoc === 'terms'
                  ? 'bg-accent-green text-black'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              Terms
            </button>
            <button
              onClick={() => onDocChange('privacy')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                activeDoc === 'privacy'
                  ? 'bg-accent-green text-black'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              Privacy
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
