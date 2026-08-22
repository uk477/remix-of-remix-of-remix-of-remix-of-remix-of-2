'use client'

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Copy,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

import { ScreenHeader } from '@/components/screen-header'
import outlookMark from '@/assets/outlook-mark.png.asset.json'
import authMark from '@/assets/auth-mark.png.asset.json'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { copyText } from '@/lib/clipboard'
import { useToast } from '@/components/toast'
import { readMails } from '@/lib/mail-reader.functions'
import { normalizeTotpSecret, validateTotpSecret } from '@/lib/dev-tools'
import { fetchTotp } from '@/lib/totp-api.functions'
import { formatDateTimeFull } from '@/lib/datetime'
import { useI18n } from '@/lib/i18n'

// ─── Menu ──────────────────────────────────────────────────────────────
export function ToolsScreen() {
  const { back, canGoBack } = useNav()

  return (
    <div className="relative min-h-full">
      <ScreenHeader title="Tools" onBack={canGoBack ? back : undefined} />
      <div className="px-4 pt-6 pb-16">
        <div className="grid gap-4">
          <ToolCard
            to="/tools/mail"
            icon={Mail}
            title="Get code from email"
            hint="Read Hotmail / Outlook emails"
            tone="info"
          />
          <ToolCard
            to="/tools/totp"
            icon={ShieldCheck}
            title="Get 2FA code"
            hint="Generate a live TOTP code"
            tone="success"
          />
        </div>
      </div>
    </div>
  )
}

function ToolCard({
  to,
  icon: Icon,
  title,
  hint,
  tone,
}: {
  to: string
  icon: typeof Mail
  title: string
  hint: string
  tone: 'info' | 'success'
}) {
  const navigate = useNavigate()
  const color =
    tone === 'info'
      ? 'border-info/40 bg-info/10 text-info shadow-[0_0_24px_-10px_var(--info)]'
      : 'border-success/40 bg-success/10 text-success shadow-[0_0_24px_-10px_var(--success)]'

  return (
    <button
      onClick={() => void navigate({ to })}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-transform active:scale-[0.98]',
        color,
      )}
    >
      <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-background/80">
        <Icon className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-bold leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </button>
  )
}

// ─── 2FA ───────────────────────────────────────────────────────────────
export function TotpToolScreen() {
  const { back, canGoBack } = useNav()
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [remaining, setRemaining] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const { show } = useToast()

  // Prefill when opened from an order (2FA button on an account row)
  useEffect(() => {
    const s = sessionStorage.getItem('tool:totp')
    if (s) {
      setSecret(s)
      sessionStorage.removeItem('tool:totp')
    }
  }, [])

  // Codes come from the 2fa.fb.tools API: it validates the key and returns the
  // OTP with its remaining lifetime, which we count down locally and refetch.
  useEffect(() => {
    let cancelled = false
    const s = normalizeTotpSecret(secret)
    if (!s) {
      setCode('')
      setError(null)
      return
    }
    if (validateTotpSecret(s)) {
      setCode('')
      setError('Invalid secret key')
      return
    }

    let timeout: number | null = null
    const load = async () => {
      let res: Awaited<ReturnType<typeof fetchTotp>> | null = null
      try {
        res = await fetchTotp({ data: { secret: s } })
      } catch {
        res = null
      }
      if (cancelled) return
      if (!res || !res.ok) {
        setCode('')
        setError('Invalid secret key')
        return
      }
      setError(null)
      setCode(res.otp)
      let left = Math.max(1, res.timeRemaining)
      setRemaining(left)
      const countdown = window.setInterval(() => {
        left -= 1
        if (left <= 0) {
          window.clearInterval(countdown)
          void load()
          return
        }
        setRemaining(left)
      }, 1000)
      timeout = countdown
    }
    void load()

    return () => {
      cancelled = true
      if (timeout !== null) window.clearInterval(timeout)
    }
  }, [secret])

  return (
    <div className="relative min-h-full">
      <ScreenHeader title="Get 2FA code" onBack={canGoBack ? back : undefined} />
      <div className="px-4 pt-4 pb-16">
        <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2">
              <img src={authMark.url} alt="2FA" className="size-10 object-contain" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold leading-tight">2FA Code Generator</h3>
              <p className="text-xs text-muted-foreground">Enter your 2FA secret key to generate a live TOTP code.</p>
            </div>
          </div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            2FA Secret Key
          </label>
          <Input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="JBSWY3DPEHPK3PXP or otpauth://…"
            className="font-mono uppercase"
            spellCheck={false}
            autoCapitalize="characters"
          />
          <button
            type="button"
            disabled={!code}
            onClick={async () => {
              if (!code) return
              await copyText(code)
              show('Code copied')
            }}
            className={cn(
              'mt-4 block w-full rounded-xl border border-border bg-background/70 p-4 text-center transition-colors',
              code ? 'cursor-pointer hover:bg-background' : 'cursor-default',
            )}
          >
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current code
            </div>
            {code ? (
              <>
                <div className="font-mono text-[38px] font-bold leading-none tabular-nums tracking-[0.2em] text-info">
                  {code}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-info transition-[width] duration-500 ease-linear"
                      style={{ width: `${(remaining / 30) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{remaining}s</span>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Copy className="size-3" /> Tap to copy
                </div>
              </>
            ) : (
              <div className="py-2 text-[13px] text-muted-foreground">
                {error ? '' : 'Enter a secret key to see the code'}
              </div>
            )}
          </button>
          {error && (
            <p className="mt-3 text-center text-[15px] font-bold text-[#ef4444]">
              {error}
            </p>
          )}
          <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
            <Lock className="size-3.5" /> Your secret key never leaves your browser. All processing is local.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Mail ──────────────────────────────────────────────────────────────
type MailMessage = Awaited<ReturnType<typeof readMails>>['messages'][number]

export function MailToolScreen() {
  const { back, canGoBack } = useNav()
  const [email, setEmail] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [clientId, setClientId] = useState('')
  const [folder, setFolder] = useState<'inbox' | 'junkemail'>('inbox')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<MailMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const { show } = useToast()
  const { lang } = useI18n()

  // Prefill when opened from an order ("Email access" chip)
  useEffect(() => {
    const raw = sessionStorage.getItem('tool:mail')
    if (!raw) return
    sessionStorage.removeItem('tool:mail')
    try {
      const d = JSON.parse(raw) as { email?: string; refresh_token?: string; client_id?: string }
      if (d.email) setEmail(d.email)
      if (d.refresh_token) setRefreshToken(d.refresh_token)
      if (d.client_id) setClientId(d.client_id)
    } catch {
      /* ignore */
    }
  }, [])

  const submit = async () => {
    setError(null)
    setLoading(true)
    setMessages(null)
    try {
      const res = await readMails({
        data: { email, refresh_token: refreshToken, client_id: clientId, folder },
      })
      if (res.error) {
        setError(res.error)
        return
      }
      setMessages(res.messages)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-full">
      <ScreenHeader title="Get code from email" onBack={canGoBack ? back : undefined} />
      <div className="px-4 pt-4 pb-16">
        <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2">
              <img src={outlookMark.url} alt="Mail" className="size-10 object-contain" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold leading-tight">Mail Reader</h3>
              <p className="text-xs text-muted-foreground">Read Hotmail &amp; Outlook emails instantly</p>
            </div>
          </div>

          <div className="grid gap-3">
            <Field label="Email">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@hotmail.com"
                className="font-mono text-[12px]"
              />
            </Field>
            <Field label="Refresh Token">
              <Textarea
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                placeholder="M.C5xxxxxxxxxxxxx…"
                className="min-h-[72px] font-mono text-[11px]"
              />
            </Field>
            <Field label="Client ID">
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="9e5f94bc-e8a4-4e73-b8be-63364c29d753"
                className="font-mono text-[12px]"
              />
            </Field>

            <div className="flex items-center gap-2 text-[11px]">
              <button
                onClick={() => setFolder('inbox')}
                className={cn(
                  'rounded-full border px-3 py-1 font-semibold',
                  folder === 'inbox'
                    ? 'border-info/60 bg-info/15 text-info'
                    : 'border-border text-muted-foreground',
                )}
              >
                Inbox
              </button>
              <button
                onClick={() => setFolder('junkemail')}
                className={cn(
                  'rounded-full border px-3 py-1 font-semibold',
                  folder === 'junkemail'
                    ? 'border-info/60 bg-info/15 text-info'
                    : 'border-border text-muted-foreground',
                )}
              >
                Junk / Spam
              </button>
            </div>

            <Button
              onClick={submit}
              disabled={loading || !email || !refreshToken || !clientId}
              className="h-11 gap-2 bg-info text-background hover:bg-info/90"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              {loading ? 'Connecting…' : 'Connect & Read Mails'}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              Supports Hotmail, Outlook & Live. Credentials are not stored — session only.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[12px] text-destructive">
              {error}
            </div>
          )}

          {messages && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{messages.length} message{messages.length === 1 ? '' : 's'}</span>
                <button
                  onClick={submit}
                  className="inline-flex items-center gap-1 text-info hover:underline"
                >
                  <RefreshCw className="size-3" /> Refresh
                </button>
              </div>
              {messages.length === 0 && (
                <div className="rounded-lg border border-border bg-background/60 p-4 text-center text-xs text-muted-foreground">
                  No messages in this folder.
                </div>
              )}
              {messages.map((m) => {
                const isOpen = openId === m.id
                return (
                  <div
                    key={m.id}
                    className="rounded-lg border border-border bg-background/60 p-3"
                  >
                    <button
                      onClick={() => setOpenId(isOpen ? null : m.id)}
                      className="flex w-full flex-col gap-1 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] font-semibold">{m.subject}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatDateTimeFull(m.received, lang)}
                        </span>
                      </div>
                      <span className="truncate text-[11px] text-muted-foreground">{m.from}</span>
                      {!isOpen && (
                        <span className="line-clamp-2 text-[11px] text-muted-foreground/80">
                          {m.preview}
                        </span>
                      )}
                    </button>
                    {isOpen && (
                      <div className="mt-3 border-t border-border pt-3">
                        {m.body_html ? (
                          <iframe
                            title="mail body"
                            sandbox=""
                            className="h-64 w-full rounded bg-white"
                            srcDoc={m.body_html}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap text-[11px] text-foreground/90">
                            {m.body_text ?? m.preview}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

