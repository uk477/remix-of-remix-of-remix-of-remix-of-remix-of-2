import { createFileRoute } from '@tanstack/react-router'

/**
 * Weekly automatic X re-check for every listed account.
 * Called by pg_cron with the project anon key in the `apikey` header.
 */
export const Route = createFileRoute('/api/public/hooks/x-refresh')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anonKey = process.env['SUPABASE_ANON_KEY']
        const provided =
          request.headers.get('apikey') ??
          request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

        if (!anonKey || !provided || provided !== anonKey) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const { runXRefresh } = await import('@/lib/x-refresh.server')
          const report = await runXRefresh({ all: true, source: 'cron' })
          return Response.json({
            success: true,
            requested: report.requested,
            updated: report.updated,
            notFound: report.notFound,
            failed: report.failed,
            skipped: report.skipped,
          })
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Unknown error'
          console.error('[cron:x-refresh]', message)
          return new Response(JSON.stringify({ success: false, error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
