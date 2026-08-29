import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@mister-guiiug/dev-wpa-config/react';
import {
  installErrorReporter,
  initSentry,
  recordError,
} from '@mister-guiiug/dev-wpa-config/react/observability';
import { initWebVitals } from '@mister-guiiug/dev-wpa-config/web-vitals';
import './index.css';
import App from './App.tsx';
import { I18nProvider } from './i18n/I18nContext';
import { ThemeProvider } from './theme/ThemeContext';

// Observabilité partagée : ring-buffer localStorage + listeners globaux.
installErrorReporter();
void initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  loader: () => import('@sentry/react'),
});

// Web Vitals via le socle (INP au lieu de FID, métriques indépendantes) :
// journal en dev uniquement — pas d'analytics tiers dans cette app.
void initWebVitals({
  loader: () => import('web-vitals'),
  onMetric: metric => {
    if (import.meta.env.DEV) {
      console.log('[Web Vitals]', metric);
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      onError={error => {
        recordError(error, { source: 'error-boundary' });
      }}
    >
      <I18nProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>
);
