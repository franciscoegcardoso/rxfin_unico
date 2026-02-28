import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

export function initPostHog() {
  if (initialized || !POSTHOG_KEY) return;
  
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    persistence: 'localStorage',
    autocapture: true,
  });
  
  initialized = true;
}

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (!initialized || !POSTHOG_KEY) return;
  posthog.capture(eventName, properties);
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (!initialized || !POSTHOG_KEY) return;
  posthog.identify(userId, traits);
}

export function resetUser() {
  if (!initialized || !POSTHOG_KEY) return;
  posthog.reset();
}

export { posthog };
