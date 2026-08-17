import { createFileRoute } from '@tanstack/react-router'

const ROUTES = ['', 'catalog', 'accounts', 'services', 'sell', 'about', 'support']

function buildSitemap(origin: string) {
  const today = new Date().toISOString().slice(0, 10)
  const urls = ROUTES.map(
    (p) => `<url><loc>${origin}/${p}</loc><lastmod>${today}</lastmod></url>`,
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url)
        const xml = buildSitemap(url.origin)
        return new Response(xml, {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
