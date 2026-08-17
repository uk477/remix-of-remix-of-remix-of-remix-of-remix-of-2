'use client'

/* Кастом-аккаунт (под ключ): подсказка «Как войти в почту?».
 * Отдельный дизайн только для услуги custom — не переиспользовать в aged/boost. */

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Mail, ShieldCheck, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { MailProviderLogo } from '@/components/mail-provider-logo'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { copyText } from '@/lib/clipboard'
import { MAIL_PROVIDERS, type MailProvider } from '@/lib/order-delivery'
import { useI18n } from '@/lib/i18n'

type Creds = {
  email?: string
  password?: string
  refreshToken?: string
  clientId?: string
  provider?: MailProvider | null
}

export function CustomMailHelpSheet({
  open,
  onOpenChange,
  creds,
  onOpenReader,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  creds: Creds
  onOpenReader: () => void
}) {
  const { lang } = useI18n()
  const ru = lang === 'ru' || lang === 'uk'
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const hasToken = !!creds.refreshToken
  const rows: { k: string; label: string; value?: string }[] = [
    { k: 'email', label: ru ? 'Почта' : 'Email', value: creds.email },
    { k: 'password', label: ru ? 'Пароль почты' : 'Email password', value: creds.password },
  ].filter((r) => !!r.value)

  async function copy(key: string, value: string) {
    await copyText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1200)
  }

  const provider = MAIL_PROVIDERS.find((p) => p.id === creds.provider) ?? null

  const readerSteps = ru
    ? [
        'Нажми «Открыть читалку почты» — токен и Client ID уже подставлены.',
        'Выбери папку «Входящие» или «Спам» и нажми «Прочитать письма».',
        'Код или письмо от X появится в списке — открой его и скопируй код.',
      ]
    : [
        'Tap "Open mail reader" — token and Client ID are prefilled.',
        'Pick Inbox or Junk and tap "Read mail".',
        'The X letter or code shows up in the list — open it and copy the code.',
      ]

  const providerSteps: Record<MailProvider, string[]> = {
    firstmail: ru
      ? [
          'Открой firstmail.ltd и нажми «Login» в правом верхнем углу.',
          'Вставь почту и пароль из заказа — они копируются одним тапом ниже.',
          'Письма от X ищи во «Входящих», при отсутствии — в «Спаме».',
        ]
      : [
          'Open firstmail.ltd and hit "Login" in the top-right corner.',
          'Paste the email and password from the order — one tap to copy below.',
          'Look for X letters in Inbox, then check Spam.',
        ],
    gmail: ru
      ? [
          'Открой mail.google.com в режиме инкогнито, чтобы не смешать со своим аккаунтом.',
          'Вставь адрес Gmail и пароль из заказа.',
          'Если Google просит подтверждение — не меняй пароль сразу, сначала напиши в поддержку.',
        ]
      : [
          'Open mail.google.com in incognito so it does not mix with your own account.',
          'Paste the Gmail address and password from the order.',
          'If Google asks to verify — do not change the password yet, contact support first.',
        ],
    outlook: ru
      ? [
          'Открой outlook.live.com в режиме инкогнито.',
          'Вставь почту и пароль из заказа.',
          'Если Microsoft просит подтверждение — код придёт в этот же ящик, обнови страницу.',
        ]
      : [
          'Open outlook.live.com in incognito.',
          'Paste the email and password from the order.',
          'If Microsoft asks to verify — the code arrives in the same inbox, refresh the page.',
        ],
  }

  const steps = hasToken
    ? readerSteps
    : provider
      ? providerSteps[provider.id]
      : ru
        ? [
            'Открой сайт своего почтового сервиса.',
            'Вставь почту и пароль из заказа — они копируются одним тапом ниже.',
            'Письма от X ищи во «Входящих», затем в «Спаме».',
          ]
        : [
            'Open your mail provider website.',
            'Paste the email and password from the order — one tap to copy below.',
            'Look for X letters in Inbox, then Spam.',
          ]

  const title = ru ? 'Как войти в почту?' : 'How to access the mailbox?'
  const subtitle = provider
    ? provider.host
    : ru
      ? 'Почта в комплекте с аккаунтом'
      : 'Mailbox included with the account'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-[28px] border-white/10 bg-card p-0"
      >
        {/* верхний градиентный акцент */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-info/12 to-transparent" />

        <div className="relative px-5 pb-7 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3.5"
          >
            <span className="relative flex size-12 items-center justify-center">
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-[30%] border border-info/30"
                animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.09, 1] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              {provider ? (
                <MailProviderLogo provider={provider.id} className="size-12" />
              ) : (
                <span className="grid size-12 place-items-center rounded-[30%] border border-white/10 bg-background/70">
                  <Mail className="size-6 text-info" />
                </span>
              )}
            </span>
            <div className="min-w-0">
              <h3 className="text-[19px] font-semibold leading-[1.15] tracking-[-0.03em]">
                {title}
              </h3>
              <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75">
                {subtitle}
              </p>
            </div>
          </motion.div>

          <div aria-hidden className="mt-5 h-px bg-gradient-to-r from-white/12 via-white/5 to-transparent" />


          {/* шаги: тонкий рельс вместо «плиток» — спокойнее и солиднее */}
          <ol className="relative mt-6 space-y-4 pl-8">
            <span
              aria-hidden
              className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-white/16 via-white/8 to-transparent"
            />
            {steps.map((s, i) => (
              <motion.li
                key={s}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + 0.08 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <span className="absolute -left-8 top-0 grid size-[23px] place-items-center rounded-full border border-white/12 bg-background text-[10.5px] font-semibold tabular-nums text-foreground/70">
                  {i + 1}
                </span>
                <span className="block text-[13px] font-normal leading-[1.6] tracking-[-0.005em] text-foreground/85">
                  {s}
                </span>
              </motion.li>
            ))}
          </ol>

          {rows.length ? (
            <div className="mt-7">
              <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                {ru ? 'Данные для входа' : 'Login details'}
              </p>
              <div className="divide-y divide-white/[0.07] overflow-hidden rounded-[18px] border border-white/[0.09] bg-white/[0.025]">
                {rows.map((r, i) => (
                  <motion.button
                    key={r.k}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + 0.07 * i, duration: 0.4 }}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => void copy(r.k, r.value!)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[9.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
                        {r.label}
                      </span>
                      <span className="mt-1 block truncate font-mono text-[12.5px] font-medium tracking-[-0.01em] text-foreground">
                        {r.value}
                      </span>
                    </span>
                    <AnimatePresence mode="wait" initial={false}>
                      {copiedKey === r.k ? (
                        <motion.span
                          key="ok"
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.7, opacity: 0 }}
                          className="grid size-8 shrink-0 place-items-center rounded-full bg-success/12 text-success"
                        >
                          <Check className="size-4" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.7, opacity: 0 }}
                          className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground"
                        >
                          <Copy className="size-3.5" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : null}

          {provider ? (
            <motion.a
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="group relative mt-6 flex w-full items-center gap-3 overflow-hidden rounded-[18px] border border-white/12 bg-gradient-to-b from-white/[0.09] to-white/[0.03] px-4 py-3.5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.07)] transition-colors hover:border-white/20"
            >
              <MailProviderLogo provider={provider.id} className="size-7 shrink-0" />
              <span className="min-w-0 flex-1 text-[13px] font-semibold tracking-[-0.01em]">
                {ru ? 'Открыть' : 'Open'} {provider.host}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-1/4 skew-x-12 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
                animate={{ x: ['-140%', '460%'] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2.6 }}
              />
            </motion.a>
          ) : null}

          {hasToken ? (
            <motion.button
              onClick={() => {
                onOpenChange(false)
                onOpenReader()
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="group mt-2.5 flex w-full items-center justify-between rounded-[18px] border border-info/30 bg-gradient-to-b from-info/[0.16] to-info/[0.06] px-4 py-3.5 text-[13px] font-semibold tracking-[-0.01em] text-info shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-colors hover:border-info/50"
            >
              <span>{ru ? 'Открыть читалку почты' : 'Open mail reader'}</span>
              <ChevronRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </motion.button>
          ) : null}

          <p className="mt-5 flex items-start gap-2 text-[10.5px] font-normal leading-[1.55] text-muted-foreground/75">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-success/80" />
            {ru
              ? 'Всё обрабатывается локально в твоём браузере. Не пересылай пароль и токен третьим лицам.'
              : 'Everything is processed locally in your browser. Never share the password or token.'}
          </p>

        </div>
      </SheetContent>
    </Sheet>
  )
}
