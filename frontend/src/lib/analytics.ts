interface GtagEvent {
  event: string;
  [key: string]: unknown;
}

interface GtagConfig {
  page_path: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
  }
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event, properties as GtagEvent);
  }
}

export function trackPageView(url: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', { page_path: url } as GtagConfig);
  }
}
