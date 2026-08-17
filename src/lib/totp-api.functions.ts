import { createServerFn } from '@tanstack/react-start'

export type TotpApiResult =
  | { ok: true; otp: string; timeRemaining: number }
  | { ok: false; error: string }

/**
 * TOTP codes come from the 2fa.fb.tools public API so an invalid key is
 * rejected by the same authority that issues the code. Proxied through a
 * server function to avoid browser CORS issues.
 */
export const fetchTotp = createServerFn({ method: 'POST' })
  .inputValidator((data: { secret?: string } | undefined) => ({
    secret: String(data?.secret ?? '').replace(/[\s=-]/g, '').toUpperCase(),
  }))
  .handler(async ({ data }): Promise<TotpApiResult> => {
    if (!data.secret) return { ok: false, error: 'Invalid secret key' }
    try {
      const response = await fetch(
        `https://2fa.fb.tools/api/otp/${encodeURIComponent(data.secret)}`,
        { headers: { accept: 'application/json' } },
      )
      if (!response.ok) return { ok: false, error: 'Invalid secret key' }
      const payload = (await response.json()) as {
        ok?: boolean
        data?: { otp?: string; timeRemaining?: number }
        error?: string
      }
      if (!payload.ok || !payload.data?.otp) {
        return { ok: false, error: 'Invalid secret key' }
      }
      return {
        ok: true,
        otp: payload.data.otp,
        timeRemaining: payload.data.timeRemaining ?? 30,
      }
    } catch {
      return { ok: false, error: 'Invalid secret key' }
    }
  })
