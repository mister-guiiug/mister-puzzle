import { useState, useEffect, useRef, useCallback } from 'react';

const THRESHOLD = 70; // px to pull before triggering
const MAX_PULL = 110; // px cap on visual stretch

export const usePullToRefresh = (onRefresh: () => Promise<void> | void) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  const trigger = useCallback(async () => {
    setRefreshing(true);
    setPullDistance(0);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only start when at the very top of the page
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        setPullDistance(Math.min(dy, MAX_PULL));
        // Prevent native scroll when pulling down
        if (dy > 10) e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= THRESHOLD) {
        await trigger();
      } else {
        setPullDistance(0);
      }
      startY.current = null;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullDistance, trigger]);

  return { pullDistance, refreshing, threshold: THRESHOLD };
};
