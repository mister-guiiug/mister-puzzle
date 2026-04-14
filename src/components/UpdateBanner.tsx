import { RefreshCw, Sparkles, X, Clock } from 'lucide-react';
import { useUpdatePrompt } from '../hooks/useUpdatePrompt';
import { useI18n } from '../i18n/I18nContext';

export function UpdateBanner() {
  const { t } = useI18n();
  const { visible, update, snooze, dismiss } = useUpdatePrompt();

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] w-full flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-3 py-3 sm:py-3.5 border-b border-primary-border bg-gradient-to-r from-primary-soft via-surface to-primary-soft shadow-md backdrop-blur-sm pt-[max(0.75rem,env(safe-area-inset-top,0px))]"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
        <Sparkles size={12} className="shrink-0" aria-hidden />
        {t('nav.updateBannerBadge')}
      </span>
      <p className="m-0 text-sm sm:text-base text-fg text-center max-w-xl font-medium basis-full sm:basis-auto">
        {t('nav.updateBannerTitle')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={update}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-primary-fill rounded-xl hover:bg-primary-fill-hover active:scale-[0.98] transition shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:ring-offset-2"
        >
          <RefreshCw size={18} className="shrink-0" aria-hidden />
          {t('nav.updateBannerCta')}
        </button>
        <button
          type="button"
          onClick={snooze}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-fg-heading border border-border-ui rounded-xl bg-surface hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
        >
          <Clock size={16} className="shrink-0 text-fg-muted" aria-hidden />
          {t('nav.updateBannerSnooze')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-fg-muted hover:text-fg-heading rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
        >
          <X size={18} className="shrink-0" aria-hidden />
          {t('nav.updateBannerDismiss')}
        </button>
      </div>
    </div>
  );
}
