import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.MODE === 'development') return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,

    tracesSampleRate: 0.1,

    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    beforeSend(event) {
      if (event.user) {
        event.user = { id: event.user.id };
      }
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          url.search = '';
          event.request.url = url.toString();
        } catch {
          // ignore
        }
      }
      if (event.breadcrumbs?.values) {
        event.breadcrumbs.values = event.breadcrumbs.values.map((b) => {
          if (b.category === 'ui.input') return { ...b, message: '[input removido]' };
          return b;
        });
      }
      return event;
    },

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error exception captured',
      /^Script error/,
      /chrome-extension/,
    ],
  });
}

export function setSentryUser(userId: string | null) {
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

export function addSentryBreadcrumb(
  category: string,
  message: string,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({ category, message, level });
}
