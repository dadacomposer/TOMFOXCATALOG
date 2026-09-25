import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const MEASUREMENT_ID = 'G-SW3ZLJN5GB';
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isPrivatePath(pathname: string) {
  return pathname === '/admin'
    || pathname.startsWith('/admin/')
    || pathname === '/my-music'
    || pathname.startsWith('/checkout-')
    || pathname === '/studio'
    || pathname.startsWith('/studio/')
    || pathname === '/share'
    || pathname.startsWith('/share/');
}

function ensureGoogleTag() {
  if (!window.dataLayer) window.dataLayer = [];
  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }

  if (!document.querySelector(`script[data-google-analytics-id="${MEASUREMENT_ID}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    script.dataset.googleAnalyticsId = MEASUREMENT_ID;
    document.head.appendChild(script);

    window.gtag('js', new Date());
    // This is a React SPA. Page views are sent below for each public route
    // change instead of relying on the initial document load alone.
    window.gtag('config', MEASUREMENT_ID, { send_page_view: false });
  }
}

export default function GoogleAnalytics() {
  const location = useLocation();
  const lastTrackedPage = useRef<string | null>(null);

  useEffect(() => {
    if (isPrivatePath(location.pathname)) return;

    const pagePath = `${location.pathname}${location.search}`;
    if (lastTrackedPage.current === pagePath) return;

    ensureGoogleTag();
    window.gtag?.('event', 'page_view', {
      page_title: document.title,
      page_location: `${window.location.origin}${pagePath}`,
    });
    lastTrackedPage.current = pagePath;
  }, [location.pathname, location.search]);

  return null;
}
