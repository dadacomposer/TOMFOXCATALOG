type RequestLike = { headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader: (name: string, value: string) => void; status: (code: number) => { send: (body: string) => void } };
type Playlist = { id: string; created_at?: string | null };
type SitemapEntry = { path: string; changefreq: string; priority: string; lastmod?: string };

const siteOrigin = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://tomfoxcatalog.com').replace(/\/$/, '');
const publicRoutes: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/browse', changefreq: 'daily', priority: '0.9' },
  { path: '/playlists', changefreq: 'weekly', priority: '0.8' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.6' },
  { path: '/enterprise', changefreq: 'monthly', priority: '0.6' },
  { path: '/terms', changefreq: 'yearly', priority: '0.2' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.2' },
  { path: '/cookie-policy', changefreq: 'yearly', priority: '0.2' },
];

function isProductionRequest(req: RequestLike) {
  const host = String(req.headers.host || '').split(':')[0];
  return process.env.VERCEL_ENV === 'production' || host === new URL(siteOrigin).hostname;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character] || character));
}

async function fetchPublicPlaylists(): Promise<Playlist[]> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return [];

  const response = await fetch(`${supabaseUrl}/rest/v1/playlists?select=id,created_at&user_id=is.null&order=created_at.desc`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!response.ok) throw new Error(`Could not load playlists for sitemap (${response.status})`);
  return response.json() as Promise<Playlist[]>;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  const isProduction = isProductionRequest(req);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
  res.setHeader('X-Robots-Tag', isProduction ? 'index, follow' : 'noindex, nofollow, noarchive');

  if (!isProduction) {
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
    return;
  }

  let playlists: Playlist[] = [];
  try {
    playlists = await fetchPublicPlaylists();
  } catch (error) {
    console.error('Sitemap playlist fetch failed', error);
  }

  const landingPages: SitemapEntry[] = (process.env.SITEMAP_LANDING_PAGES || '')
    .split(',')
    .map((path) => path.trim())
    .filter((path) => /^\/[a-z0-9/_-]*$/i.test(path))
    .map((path) => ({ path, changefreq: 'monthly', priority: '0.7' }));
  const entries = [
    ...publicRoutes,
    ...landingPages,
    ...playlists.map((playlist) => ({ path: `/playlists/${playlist.id}`, changefreq: 'weekly', priority: '0.7', lastmod: playlist.created_at || undefined })),
  ];
  const body = entries.map(({ path, changefreq, priority, lastmod }) => `  <url>\n    <loc>${escapeXml(`${siteOrigin}${path}`)}</loc>${lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join('\n');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`);
}
