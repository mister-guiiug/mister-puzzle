import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { I18nProvider } from './i18n/I18nContext';
import { ThemeProvider } from './theme/ThemeContext';
import { initWebVitals } from './monitoring/web-vitals';

// Initialiser le monitoring des Web Vitals
initWebVitals();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
);
