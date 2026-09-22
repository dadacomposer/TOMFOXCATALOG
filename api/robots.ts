type RequestLike = { headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader: (name: string, value: string) => void; status: (code: number) => { send: (body: string) => void } };

const siteOrigin = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://tomfoxcatalog.com').replace(/\/$/, '');

function isProductionRequest(req: RequestLike) {
  const host = String(req.headers.host || '').split(':')[0];
  return process.env.VERCEL_ENV === 'production' || host === new URL(siteOrigin).hostname;
}

export default function handler(req: RequestLike, res: ResponseLike) {
  const isProduction = isProductionRequest(req);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
  res.setHeader('X-Robots-Tag', isProduction ? 'index, follow' : 'noindex, nofollow, noarchive');

  if (!isProduction) {
    res.status(200).send('User-agent: *\nDisallow: /\n');
    return;
  }

  res.status(200).send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/\nDisallow: /my-music\nDisallow: /checkout-resume\nDisallow: /checkout-success\nDisallow: /checkout-cancel\nDisallow: /share/\n\nSitemap: ${siteOrigin}/sitemap.xml\n`);
}
