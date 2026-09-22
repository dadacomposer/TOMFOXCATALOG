import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_ORIGIN = (import.meta.env.VITE_SITE_URL || 'https://tomfoxcatalog.com').replace(/\/$/, '');

const routeMeta: Record<string, { title: string; description: string }> = {
  '/': { title: 'Tom Fox | 2600+ tracks, selected for creators', description: 'The soundtrack of modern storytelling. Discover and license curated original music for creators, filmmakers, and studios.' },
  '/browse': { title: 'Browse Music | Tom Fox Catalog', description: 'Search, preview, and license curated original music for film, video, podcasts, and modern storytelling.' },
  '/playlists': { title: 'Playlists | Tom Fox Catalog', description: 'Explore curated playlists of original music for your next creative project.' },
  '/pricing': { title: 'Pricing & Licensing | Tom Fox Catalog', description: 'Explore music licensing options for creators, commercial projects, and tailored usage.' },
  '/enterprise': { title: 'Enterprise Licensing | Tom Fox Catalog', description: 'Custom music licensing for productions, agencies, and organisations with a larger brief.' },
  '/terms': { title: 'Terms of Service | Tom Fox Catalog', description: 'Terms of Service for Tom Fox Catalog.' },
  '/privacy': { title: 'Privacy Policy | Tom Fox Catalog', description: 'Privacy Policy for Tom Fox Catalog.' },
  '/cookie-policy': { title: 'Cookie Policy | Tom Fox Catalog', description: 'Cookie and browser-storage policy for Tom Fox Catalog.' },
};

function updateMeta(selector: string, attribute: 'name' | 'property', attributeValue: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, attributeValue);
    document.head.appendChild(element);
  }
  element.content = content;
}

export default function Seo() {
  const location = useLocation();

  useEffect(() => {
    const canonicalUrl = `${SITE_ORIGIN}${location.pathname}`;
    const isPrimaryHost = window.location.hostname === new URL(SITE_ORIGIN).hostname;
    const isPrivateRoute = ['/admin', '/my-music', '/checkout-resume', '/checkout-success', '/checkout-cancel'].some((path) => location.pathname.startsWith(path)) || location.pathname.startsWith('/share');
    const isFilteredBrowse = location.pathname === '/browse' && Boolean(location.search);
    const shouldIndex = isPrimaryHost && !isPrivateRoute && !isFilteredBrowse;
    const meta = location.pathname.startsWith('/playlists/')
      ? { title: 'Playlist | Tom Fox Catalog', description: 'A curated playlist of original music from Tom Fox Catalog.' }
      : routeMeta[location.pathname] || routeMeta['/'];

    document.title = meta.title;
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonicalUrl);
    updateMeta('meta[name="description"]', 'name', 'description', meta.description);
    updateMeta('meta[name="robots"]', 'name', 'robots', shouldIndex ? 'index, follow' : 'noindex, nofollow, noarchive');
    updateMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    updateMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
    updateMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
    updateMeta('meta[name="twitter:url"]', 'name', 'twitter:url', canonicalUrl);
    updateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
    updateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);
  }, [location.pathname, location.search]);

  return null;
}
