import { createFileRoute } from '@tanstack/react-router'

// Public cron endpoint. `/api/public/*` bypasses site auth; we protect it with
// the Supabase publishable key in the `apikey` header (pg_cron sets it).
export const Route = createFileRoute('/api/public/boost/health-check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get('apikey')
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: 'unauthorized' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          })
        }

        const { runHealthCheck } = await import('@/lib/boost-health.server')
        const result = await runHealthCheck()
        return Response.json({ ok: true, ...result })
      },
      // Simple GET so admins/devs can hit it in a browser to confirm it exists
      // (still returns 401 without the correct apikey).
      GET: async () =>
        Response.json({ ok: true, message: 'POST with apikey header to run health check' }),
    },
  },
})
