import { useEffect, useRef } from 'react';

export function usePolling(fetchFn, intervalMs, enabled) {
  const savedFn = useRef(fetchFn);

  useEffect(() => {
    savedFn.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) return;

    // Fetch immediately
    savedFn.current();

    const id = setInterval(() => {
      savedFn.current();
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
