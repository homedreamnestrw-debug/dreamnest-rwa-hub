import { useCallback, useRef, useState } from "react";

/**
 * Generic undo/redo state. Pushes a new entry on every set() call.
 * Optional `coalesceMs` merges rapid-fire updates (e.g. typing) into one history entry.
 */
export function useUndoRedo<T>(initial: T, coalesceMs = 400) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initial);
  const [future, setFuture] = useState<T[]>([]);
  const lastPushRef = useRef<number>(0);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setPresent((prev) => {
        const value =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        if (Object.is(value, prev)) return prev;
        const now = Date.now();
        const shouldCoalesce = now - lastPushRef.current < coalesceMs;
        lastPushRef.current = now;
        setPast((p) => (shouldCoalesce && p.length ? p : [...p, prev]));
        setFuture([]);
        return value;
      });
    },
    [coalesceMs],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [present, ...f]);
      setPresent(prev);
      return p.slice(0, -1);
    });
  }, [present]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setPast((p) => [...p, present]);
      setPresent(next);
      return f.slice(1);
    });
  }, [present]);

  const reset = useCallback((value: T) => {
    setPast([]);
    setFuture([]);
    setPresent(value);
  }, []);

  return {
    value: present,
    set,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
