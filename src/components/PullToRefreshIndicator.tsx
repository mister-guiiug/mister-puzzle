import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  threshold: number;
}

const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  pullDistance,
  refreshing,
  threshold,
}) => {
  const visible = pullDistance > 0 || refreshing;
  if (!visible) return null;

  const ready = pullDistance >= threshold;
  const rotation = refreshing ? undefined : `rotate(${(pullDistance / threshold) * 180}deg)`;

  return (
    <div
      className="fixed top-14 left-0 right-0 z-40 flex justify-center pointer-events-none transition-all duration-150"
      style={{ transform: `translateY(${Math.min(pullDistance, 80)}px)` }}
    >
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-md text-sm font-semibold transition-colors duration-200 ${
          refreshing
            ? 'bg-primary-fill text-white'
            : ready
            ? 'bg-primary-bar text-white'
            : 'bg-surface text-primary-muted border border-primary-border'
        }`}
      >
        <RefreshCw
          size={16}
          style={{ transform: rotation }}
          className={refreshing ? 'animate-spin' : 'transition-transform duration-150'}
        />
        {refreshing ? 'Actualisation...' : ready ? 'Relâchez pour actualiser' : 'Tirez pour actualiser'}
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
