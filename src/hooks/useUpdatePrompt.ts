import { useState, useEffect, useRef, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

const SNOOZE_KEY = 'mister_puzzle_update_snooze_until_ms';

function readSnoozeUntil(): number {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) || 0);
  } catch {
    return 0;
  }
}

export function useUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [epochMs, setEpochMs] = useState(() => Date.now());
  const updateSWRef = useRef<((reload?: boolean) => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    updateSWRef.current = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
        setSessionDismissed(false);
        setEpochMs(Date.now());
      },
      onOfflineReady() {},
    });
  }, []);

  useEffect(() => {
    if (!needRefresh || sessionDismissed) return;
    const id = window.setInterval(() => {
      setEpochMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(id);
  }, [needRefresh, sessionDismissed]);

  const update = useCallback(() => updateSWRef.current?.(true), []);

  const dismiss = useCallback(() => setSessionDismissed(true), []);

  const snooze = useCallback(() => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    } catch {
      /* ignore */
    }
    setEpochMs(Date.now());
  }, []);

  const visible =
    Boolean(needRefresh) &&
    !sessionDismissed &&
    !(readSnoozeUntil() > epochMs);

  return { visible, update, snooze, dismiss };
}
