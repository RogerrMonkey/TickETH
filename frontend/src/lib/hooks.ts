'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from './store';
import type { UserRole } from './types';

/* ─── useRequireAuth ──────────────────────────────────── */
/**
 * Redirect to home page when the user disconnects their wallet
 * or is not authenticated. Optionally require specific roles.
 *
 * Usage:
 *   useRequireAuth();                         // any authenticated user
 *   useRequireAuth(['organizer', 'admin']);    // specific roles only
 */
export function useRequireAuth(requiredRoles?: UserRole[]) {
  const { user, hydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;           // wait for auth state to load
    if (!user) {
      router.replace('/');
      return;
    }
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      router.replace('/');
    }
  }, [user, hydrated, requiredRoles, router]);

  return { user, hydrated, isAuthed: !!user };
}

/* ─── useDebounce ─────────────────────────────────────── */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/* ─── useCountdown ────────────────────────────────────── */
export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

export function useCountdown(targetDate: string | Date): CountdownResult {
  const getRemaining = useCallback(() => {
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
    const totalSeconds = Math.floor(diff / 1000);
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      isExpired: false,
      totalSeconds,
    };
  }, [targetDate]);

  const [countdown, setCountdown] = useState(getRemaining);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(getRemaining()), 1000);
    return () => clearInterval(timer);
  }, [getRemaining]);

  return countdown;
}

/* ─── useCopyToClipboard ──────────────────────────────── */
export function useCopyToClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelay);
        return true;
      } catch {
        return false;
      }
    },
    [resetDelay],
  );

  return { copied, copy };
}

/* ─── useScrollLock ───────────────────────────────────── */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}

/* ─── useFocusTrap ────────────────────────────────────── */
export function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const container = ref.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Focus first element
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return ref;
}
