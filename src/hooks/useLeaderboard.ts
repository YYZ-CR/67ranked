'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { LeaderboardEntry, DURATION_6_7S } from '@/types/game';

const REFRESH_INTERVAL = 60000; // 60 seconds

export interface UseLeaderboardReturn {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  selectedDuration: number;
  setSelectedDuration: (duration: number) => void;
  refresh: () => Promise<void>;
}

export function useLeaderboard(): UseLeaderboardReturn {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(DURATION_6_7S);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLeaderboard = useCallback(async (duration: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/leaderboard?duration_ms=${duration}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await response.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchLeaderboard(selectedDuration);
  }, [fetchLeaderboard, selectedDuration]);

  // Fetch when duration changes
  useEffect(() => {
    fetchLeaderboard(selectedDuration);
  }, [selectedDuration, fetchLeaderboard]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchLeaderboard(selectedDuration);
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedDuration, fetchLeaderboard]);

  return {
    entries,
    isLoading,
    error,
    selectedDuration,
    setSelectedDuration,
    refresh
  };
}
