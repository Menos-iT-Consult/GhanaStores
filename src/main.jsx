/**
 * DiDwa PWA bootstrap.
 *
 * ErrorBoundary is the outermost component on purpose: it is the only thing
 * standing between a render-time bug and a blank white page.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);

/* Progressive Web App: register the offline shell service worker. */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* SW is an enhancement; the app works without it. */
    });
  });
}
