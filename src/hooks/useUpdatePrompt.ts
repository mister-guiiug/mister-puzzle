import { useState, useEffect, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function useUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef<((reload?: boolean) => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    updateSWRef.current = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {},
    });
  }, []);

  const update = () => updateSWRef.current?.(true);

  return { needRefresh, update };
}
