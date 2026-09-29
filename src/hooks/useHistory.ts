"use client";

import { useCallback, useRef, useState } from "react";

const LIMIT = 80;
const COALESCE_MS = 700;

type State<T> = { past: T[]; present: T; future: T[] };

/**
 * Undo/redo for an immutable value. Consecutive updates that share a
 * `coalesce` key (e.g. typing in the title) become a single history step.
 */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<State<T>>({ past: [], present: initial, future: [] });
  const last = useRef<{ key: string | null; at: number }>({ key: null, at: 0 });

  const set = useCallback((next: T | ((cur: T) => T), opts: { coalesce?: string; replace?: boolean } = {}) => {
    // Decide outside the updater so it stays pure (StrictMode runs updaters twice).
    const now = Date.now();
    const merge = opts.replace || (!!opts.coalesce && last.current.key === opts.coalesce && now - last.current.at < COALESCE_MS);
    last.current = { key: opts.coalesce ?? null, at: now };
    setState((s) => {
      const value = typeof next === "function" ? (next as (cur: T) => T)(s.present) : next;
      if (Object.is(value, s.present)) return s;
      if (merge) return { ...s, present: value, future: [] };
      return { past: [...s.past, s.present].slice(-LIMIT), present: value, future: [] };
    });
  }, []);

  /** Replaces the value and clears history (e.g. loading a file). */
  const reset = useCallback((value: T) => {
    last.current = { key: null, at: 0 };
    setState({ past: [], present: value, future: [] });
  }, []);

  const undo = useCallback(() => {
    last.current = { key: null, at: 0 };
    setState((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s));
  }, []);

  const redo = useCallback(() => {
    last.current = { key: null, at: 0 };
    setState((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s));
  }, []);

  return {
    value: state.present,
    set,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
