'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  Hash,
  Loader2,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { money } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import type { Lang, Topup } from '@/lib/types'
import { CoinIcon } from './ui/coin-icon'
import { useToast } from './toast'
import { formatDateTimeFull } from '@/lib/datetime'


const L: Record<string, Record<Lang, string>> = {
  title: {
    en: 'Top-up details', ru: 'Детали пополнения', ar: 'تفاصيل الشحن', zh: '充值详情',
    es: 'Detalles de recarga', tr: 'Yükleme detayları', pt: 'Detalhes da recarga',
    fr: 'Détails de la recharge', uk: 'Деталі поповнення',
  },
  order_id: {
    en: 'Order ID', ru: 'ID заявки', ar: 'رقم الطلب', zh: '订单编号',
    es: 'ID de pedido', tr: 'Sipariş ID', pt: 'ID do pedido', fr: 'ID de commande', uk: 'ID заявки',
  },
  amount: {
    en: 'Amount', ru: 'Сумма', ar: 'المبلغ', zh: '金额',
    es: 'Monto', tr: 'Tutar', pt: 'Valor', fr: 'Montant', uk: 'Сума',
  },
  network: {
    en: 'Network', ru: 'Сеть', ar: 'الشبكة', zh: '网络',
    es: 'Red', tr: 'Ağ', pt: 'Rede', fr: 'Réseau', uk: 'Мережа',
  },
  created: {
    en: 'Created', ru: 'Создано', ar: 'أُنشئ', zh: '创建时间',
    es: 'Creado', tr: 'Oluşturuldu', pt: 'Criado', fr: 'Créé', uk: 'Створено',
  },
  closed: {
    en: 'Closed', ru: 'Закрыто', ar: 'أُغلق', zh: '关闭时间',
    es: 'Cerrado', tr: 'Kapatıldı', pt: 'Encerrado', fr: 'Clôturé', uk: 'Закрито',
  },
  expires: {
    en: 'Expires', ru: 'Истекает', ar: 'ينتهي', zh: '过期时间',
    es: 'Expira', tr: 'Sona eriyor', pt: 'Expira', fr: 'Expire', uk: 'Спливає',
  },
  status: {
    en: 'Status', ru: 'Статус', ar: 'الحالة', zh: '状态',
    es: 'Estado', tr: 'Durum', pt: 'Status', fr: 'Statut', uk: 'Статус',
  },
  address: {
    en: 'Address', ru: 'Адрес', ar: 'العنوان', zh: '地址',
    es: 'Dirección', tr: 'Adres', pt: 'Endereço', fr: 'Adresse', uk: 'Адреса',
  },
  tx: {
    en: 'Transaction hash', ru: 'Хеш транзакции', ar: 'هاش المعاملة', zh: '交易哈希',
    es: 'Hash de transacción', tr: 'İşlem hash’i', pt: 'Hash da transação', fr: 'Hash de transaction', uk: 'Хеш транзакції',
  },
  view_tx: {
    en: 'View transaction', ru: 'Посмотреть транзакцию', ar: 'عرض المعاملة',
    zh: '查看交易', es: 'Ver transacción', tr: 'İşlemi görüntüle',
    pt: 'Ver transação', fr: 'Voir la transaction', uk: 'Переглянути транзакцію',
  },
  copy: {
    en: 'Copy', ru: 'Копировать', ar: 'نسخ', zh: '复制',
    es: 'Copiar', tr: 'Kopyala', pt: 'Copiar', fr: 'Copier', uk: 'Копіювати',
  },
  st_success: {
    en: 'Payment received', ru: 'Оплата получена', ar: 'تم استلام الدفع',
    zh: '已收到付款', es: 'Pago recibido', tr: 'Ödeme alındı',
    pt: 'Pagamento recebido', fr: 'Paiement reçu', uk: 'Оплату отримано',
  },
  st_pending: {
    en: 'Awaiting payment', ru: 'Ожидает оплаты', ar: 'بانتظار الدفع',
    zh: '等待付款', es: 'Esperando pago', tr: 'Ödeme bekleniyor',
    pt: 'Aguardando pagamento', fr: 'En attente de paiement', uk: 'Очікує оплати',
  },
  st_declined: {
    en: 'Cancelled', ru: 'Отменено', ar: 'ملغى', zh: '已取消',
    es: 'Cancelado', tr: 'İptal edildi', pt: 'Cancelado', fr: 'Annulé', uk: 'Скасовано',
  },
  st_declined_hint: {
    en: 'Invoice expired after 30 minutes.',
    ru: 'Счёт истёк по прошествии 30 минут.',
    ar: 'انتهت صلاحية الفاتورة بعد 30 دقيقة.',
    zh: '账单已在 30 分钟后过期。',
    es: 'La factura expiró tras 30 minutos.',
    tr: 'Fatura 30 dakika sonra sona erdi.',
    pt: 'A fatura expirou após 30 minutos.',
    fr: 'La facture a expiré après 30 minutes.',
    uk: 'Рахунок сплив після 30 хвилин.',
  },
  st_pending_hint: {
    en: 'Waiting for network confirmation. Auto-cancels in 30 min.',
    ru: 'Ожидаем подтверждение сети. Автоотмена через 30 минут.',
    ar: 'بانتظار تأكيد الشبكة. إلغاء تلقائي خلال 30 دقيقة.',
    zh: '等待网络确认。30 分钟后自动取消。',
    es: 'Esperando confirmación de red. Se cancela en 30 min.',
    tr: 'Ağ onayı bekleniyor. 30 dk sonra otomatik iptal edilir.',
    pt: 'Aguardando confirmação da rede. Cancela em 30 min.',
    fr: 'En attente de confirmation réseau. Annulé dans 30 min.',
    uk: 'Очікуємо підтвердження мережі. Автоскасування через 30 хв.',
  },
  copied: {
    en: 'Copied', ru: 'Скопировано', ar: 'تم النسخ', zh: '已复制',
    es: 'Copiado', tr: 'Kopyalandı', pt: 'Copiado', fr: 'Copié', uk: 'Скопійовано',
  },
  continue_pay: {
    en: 'Continue payment', ru: 'Продолжить оплату', ar: 'متابعة الدفع',
    zh: '继续付款', es: 'Continuar el pago', tr: 'Ödemeye devam et',
    pt: 'Continuar pagamento', fr: 'Continuer le paiement', uk: 'Продовжити оплату',
  },
  continue_hint: {
    en: 'Open the invoice to send funds', ru: 'Откройте счёт и отправьте средства',
    ar: 'افتح الفاتورة لإرسال الأموال', zh: '打开发票以发送资金',
    es: 'Abre la factura para enviar fondos', tr: 'Faturayı açıp gönderim yapın',
    pt: 'Abra a fatura para enviar fundos', fr: 'Ouvrez la facture pour envoyer',
    uk: 'Відкрийте рахунок, щоб надіслати кошти',
  },
}


const EXPLORER: Record<string, (hash: string) => string> = {
  BTC: (h) => `https://mempool.space/tx/${h}`,
  LTC: (h) => `https://blockchair.com/litecoin/transaction/${h}`,
  DOGE: (h) => `https://blockchair.com/dogecoin/transaction/${h}`,
  ETH: (h) => `https://etherscan.io/tx/${h}`,
  ETHEREUM: (h) => `https://etherscan.io/tx/${h}`,
  BASE: (h) => `https://basescan.org/tx/${h}`,
  POL: (h) => `https://polygonscan.com/tx/${h}`,
  POLYGON: (h) => `https://polygonscan.com/tx/${h}`,
  MATIC: (h) => `https://polygonscan.com/tx/${h}`,
  ARB: (h) => `https://arbiscan.io/tx/${h}`,
  ARBITRUM: (h) => `https://arbiscan.io/tx/${h}`,
  BNB: (h) => `https://bscscan.com/tx/${h}`,
  BSC: (h) => `https://bscscan.com/tx/${h}`,
  TRX: (h) => `https://tronscan.org/#/transaction/${h}`,
  TRON: (h) => `https://tronscan.org/#/transaction/${h}`,
  SOL: (h) => `https://solscan.io/tx/${h}`,
  SOLANA: (h) => `https://solscan.io/tx/${h}`,
  TON: (h) => `https://tonviewer.com/transaction/${h}`,
  XRP: (h) => `https://xrpscan.com/tx/${h}`,
}

function explorerUrl(coin: string, network: string, hash: string) {
  const key = (network || coin).toUpperCase()
  const fn = EXPLORER[key] ?? EXPLORER[coin.toUpperCase()]
  return fn ? fn(hash) : null
}

function fmtDate(ts: number, lang: string) {
  return formatDateTimeFull(ts, lang)
}

function short(s: string, head = 8, tail = 6) {
  if (s.length <= head + tail + 2) return s
  return `${s.slice(0, head)}…${s.slice(-tail)}`
}

export function TopupDetailsSheet({
  topup,
  onClose,
}: {
  topup: Topup | null
  onClose: () => void
}) {
  const { lang } = useI18n()
  const { show } = useToast()
  const navigate = useNavigate()
  const tx = (k: keyof typeof L) => L[k][lang]

  const continuePayment = () => {
    if (!topup) return
    const id = topup.id
    // Navigate first — leaving /history unmounts the sheet with no flash.
    void navigate({ to: '/topup', search: (prev: Record<string, unknown>) => ({ ...prev, resume: id }) as never })
    // Safety: clear body overflow if the parent state doesn't reset before unmount.
    document.body.style.overflow = ''
  }

  useEffect(() => {
    if (!topup) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [topup, onClose])

  const url = useMemo(
    () => (topup?.txHash ? explorerUrl(topup.coin, topup.network, topup.txHash) : null),
    [topup],
  )

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {})
    show(tx('copied'))
  }

  const status = topup?.status
  const statusMeta =
    status === 'success'
      ? {
          label: tx('st_success'),
          Icon: CheckCircle2,
          ring: 'ring-success/25',
          bg: 'bg-success/10',
          fg: 'text-success',
        }
      : status === 'declined'
        ? {
            label: tx('st_declined'),
            Icon: XCircle,
            ring: 'ring-destructive/25',
            bg: 'bg-destructive/10',
            fg: 'text-destructive',
          }
        : {
            label: tx('st_pending'),
            Icon: Loader2,
            ring: 'ring-warning/25',
            bg: 'bg-warning/10',
            fg: 'text-warning',
          }

  return (
    <AnimatePresence>
      {topup && (
        <>
          <motion.button
            aria-label="close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose()
            }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[28px] border-t border-white/10 bg-card/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-white/15" />

            <button
              onClick={onClose}
              aria-label="close"
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/5 text-muted-foreground active:scale-90"
            >
              <X className="size-4" />
            </button>

            <div className="max-h-[85vh] overflow-y-auto px-5 pb-8 pt-5">
              {/* Hero */}
              <div className="mb-5 flex flex-col items-center text-center">
                <div className={`relative mb-3 flex size-20 items-center justify-center rounded-3xl ${statusMeta.bg} ring-8 ${statusMeta.ring}`}>
                  {/* Cyclic pulse — one per status, same rhythm */}
                  <motion.span
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 rounded-3xl ring-2 ${
                      status === 'success'
                        ? 'ring-success/50'
                        : status === 'declined'
                          ? 'ring-destructive/50'
                          : 'ring-warning/50'
                    }`}
                    initial={false}
                    animate={{ scale: [1, 1.35], opacity: [0.55, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.span
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 rounded-3xl ring-2 ${
                      status === 'success'
                        ? 'ring-success/40'
                        : status === 'declined'
                          ? 'ring-destructive/40'
                          : 'ring-warning/40'
                    }`}
                    initial={false}
                    animate={{ scale: [1, 1.55], opacity: [0.4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1 }}
                  />
                  <CoinIcon symbol={topup.coin} network={topup.network} className="relative size-12" />
                </div>


                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {tx('title')}
                </p>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className={`mt-1 text-4xl font-bold tabular-nums ${status === 'declined' ? 'text-muted-foreground line-through' : status === 'success' ? 'text-success' : 'text-foreground'}`}
                >
                  {status === 'success' ? '+' : ''}
                  {money(topup.amount)}
                </motion.p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {topup.coin} · {topup.network}
                </p>
                <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.bg} ${statusMeta.fg}`}>
                  <statusMeta.Icon className={`size-3.5 ${status === 'pending' ? 'animate-spin' : ''}`} />
                  {statusMeta.label}
                </div>
                {status !== 'success' && (
                  <p className="mt-2 max-w-[260px] text-[11px] leading-relaxed text-muted-foreground">
                    {status === 'declined' ? tx('st_declined_hint') : tx('st_pending_hint')}
                  </p>
                )}
              </div>

              {/* Fields */}
              <div className="space-y-1.5 rounded-2xl border border-white/5 bg-white/[0.02] p-2">
                <Row
                  icon={<Hash className="size-4" />}
                  label={tx('order_id')}
                  value={short(topup.id, 6, 6)}
                  onCopy={() => copy(topup.id)}
                />
                <Row
                  icon={<Wallet className="size-4" />}
                  label={tx('amount')}
                  value={`${money(topup.amount)} · ${topup.coin}`}
                />
                <Row
                  icon={<ArrowUpRight className="size-4" />}
                  label={tx('network')}
                  value={topup.network || topup.coin}
                />
                <Row
                  icon={<Clock className="size-4" />}
                  label={tx('created')}
                  value={fmtDate(topup.date, lang)}
                />
                {topup.closedAt && (
                  <Row
                    icon={<Clock className="size-4" />}
                    label={tx('closed')}
                    value={fmtDate(topup.closedAt, lang)}
                  />
                )}
                {topup.status === 'pending' && (
                  <Row
                    icon={<Clock className="size-4" />}
                    label={tx('expires')}
                    value={fmtDate(topup.date + 30 * 60 * 1000, lang)}
                  />
                )}
                {topup.status === 'pending' && topup.address && (
                  <Row
                    icon={<Wallet className="size-4" />}
                    label={tx('address')}
                    value={short(topup.address)}
                    mono
                    onCopy={() => copy(topup.address!)}
                  />
                )}
                {topup.txHash && (
                  <Row
                    icon={<Hash className="size-4" />}
                    label={tx('tx')}
                    value={short(topup.txHash, 12, 10)}
                    mono
                    onCopy={() => copy(topup.txHash!)}
                  />
                )}
              </div>

              {topup.status === 'pending' && (
                <motion.button
                  type="button"
                  onClick={continuePayment}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="group relative mt-4 flex w-full items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-warning/95 via-warning to-warning/90 px-5 py-4 text-left shadow-[0_10px_30px_-10px_hsl(var(--warning)/0.6)] ring-1 ring-warning/40 active:scale-[0.985]"
                >
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/25 blur-md"
                    animate={{ x: ['0%', '450%'] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
                  />
                  <span className="relative flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-black/15 text-background ring-1 ring-white/20">
                      <Wallet className="size-5" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[15px] font-bold leading-tight text-background">
                        {tx('continue_pay')}
                      </span>
                      <span className="text-[11px] font-medium text-background/70">
                        {tx('continue_hint')}
                      </span>
                    </span>
                  </span>
                  <span className="relative flex size-9 items-center justify-center rounded-full bg-black/20 text-background ring-1 ring-white/25 transition-transform group-active:translate-x-0.5">
                    <ArrowRight className="size-4" />
                  </span>
                </motion.button>
              )}

              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
                >
                  {tx('view_tx')}
                  <ArrowUpRight className="size-4" />

                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({
  icon,
  label,
  value,
  onCopy,
  mono,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onCopy?: () => void
  mono?: boolean
}) {
  const Comp: any = onCopy ? 'button' : 'div'
  return (
    <Comp
      onClick={onCopy}
      type={onCopy ? 'button' : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${onCopy ? 'hover:bg-white/[0.04] active:scale-[0.99] active:bg-white/[0.06]' : ''}`}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/80">
          {label}
        </p>
        <p className={`truncate text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
      {onCopy && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground">
          <Copy className="size-3.5" />
        </span>
      )}
    </Comp>
  )

}
