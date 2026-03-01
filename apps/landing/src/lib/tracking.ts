// Tracking utility for Google Analytics 4, Meta Pixel, and Supabase
// Replace G-XXXXXXXXXX and YOUR_PIXEL_ID in index.html with your real IDs

import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
  }
}

/** Returns true if running inside Lovable preview iframe or a known bot */
const isPreviewOrBot = (): boolean => {
  const host = window.location.hostname;
  // Lovable preview domains
  if (host.includes('preview') && host.includes('lovable.app')) return true;
  // Localhost dev
  if (host === 'localhost' || host === '127.0.0.1') return true;
  return false;
};

const getSessionId = () => {
  let sid = sessionStorage.getItem('rxfin_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('rxfin_sid', sid);
  }
  return sid;
};

const trackToDb = (eventType: string, eventName: string, metadata?: Record<string, unknown>) => {
  if (isPreviewOrBot()) return;
  supabase.from('conversion_events' as any).insert({
    event_type: eventType,
    event_data: { event_name: eventName, ...metadata },
    page: window.location.pathname,
    session_id: getSessionId(),
  }).then(() => {});
};

const trackPageViewToDb = () => {
  if (isPreviewOrBot()) return;
  supabase.from('page_views' as any).insert({
    page: window.location.pathname,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
    session_id: getSessionId(),
  }).then(() => {});
};

const ga = (...args: unknown[]) => {
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  }
};

const fbq = (...args: unknown[]) => {
  if (typeof window.fbq === 'function') {
    window.fbq(...args);
  }
};

export const trackPageView = () => {
  ga('event', 'page_view');
  fbq('track', 'PageView');
  trackPageViewToDb();

  const sid = getSessionId();
  if (typeof window.clarity === 'function') {
    window.clarity("set", "session_id", sid);
  }
};

export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  ga('event', eventName, params);
  trackToDb('event', eventName, params);
};

export const trackCTAClick = (ctaName: string, destination: string) => {
  ga('event', 'cta_click', { cta_name: ctaName, destination });
  fbq('track', 'Lead', { content_name: ctaName });
  trackToDb('cta_click', ctaName, { cta_name: ctaName, destination });
};

export const trackSimulatorClick = (simulatorName: string) => {
  ga('event', 'simulator_start', { simulator_name: simulatorName });
  fbq('track', 'InitiateCheckout', { content_name: simulatorName });
  trackToDb('simulator_start', simulatorName, { simulator_name: simulatorName });
};

export const trackSignUpIntent = (source: string) => {
  ga('event', 'sign_up_intent', { source });
  fbq('track', 'CompleteRegistration', { content_name: source });
  trackToDb('sign_up_intent', source);
};

export const trackFeaturePreview = (featureName: string) => {
  ga('event', 'feature_preview_open', { feature_name: featureName });
  fbq('track', 'ViewContent', { content_name: featureName });
  trackToDb('feature_preview', featureName, { feature_name: featureName });
};

export const trackSlideNavigation = (featureName: string, slideIndex: number) => {
  ga('event', 'slide_navigation', { feature_name: featureName, slide_index: slideIndex });
  trackToDb('slide_navigation', featureName, { slide_index: slideIndex });
};

export const trackWaitlistClick = (location: 'header' | 'mid' | 'final') => {
  const eventName = `cta_waitlist_click_${location}`;
  ga('event', eventName);
  fbq('track', 'Lead', { content_name: eventName });
  trackToDb('waitlist_click', eventName, { location });
};

export const trackMicroCtaClick = (featureId: string) => {
  ga('event', 'micro_cta_click', { feature_id: featureId });
  trackToDb('micro_cta_click', featureId, { feature_id: featureId });
};

export const trackSocialClick = (platform: string) => {
  ga('event', 'social_click', { platform });
  trackToDb('social_click', platform);
};

export const trackContactClick = (method: string) => {
  ga('event', 'contact_click', { method });
  trackToDb('contact_click', method);
};

// Scroll depth tracking
export const initScrollTracking = () => {
  const thresholds = [25, 50, 75, 100];
  const fired = new Set<number>();

  const handleScroll = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;
    const percent = Math.round((window.scrollY / scrollHeight) * 100);

    for (const t of thresholds) {
      if (percent >= t && !fired.has(t)) {
        fired.add(t);
        ga('event', 'scroll_depth', { percent: t });
        fbq('trackCustom', 'ScrollDepth', { percent: t });
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
};
