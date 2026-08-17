'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, EyeOff, Lock, ShieldCheck, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { CoinIcon } from './ui/coin-icon'
import type { Lang } from '@/lib/types'

const TG_HANDLE = 'aurex_agency'
const TG_URL = `https://t.me/${TG_HANDLE}`

type L = { en: string } & Partial<Record<Lang, string>>
const pick = (o: L, lang: Lang) => o[lang] ?? o.en

const COPY = {
  badge: {
    en: 'Private settlement',
    ru: 'Приватный расчёт',
    uk: 'Приватний розрахунок',
    es: 'Liquidación privada',
    tr: 'Gizli ödeme',
    pt: 'Liquidação privada',
    fr: 'Règlement privé',
    ar: 'تسوية خاصة',
    zh: '隐私结算',
  } as L,
  title: {
    en: 'Monero — manager only',
    ru: 'Monero — только через менеджера',
    uk: 'Monero — лише через менеджера',
    es: 'Monero — solo con manager',
    tr: 'Monero — sadece yönetici ile',
    pt: 'Monero — apenas com gerente',
    fr: 'Monero — via manager uniquement',
    ar: 'مونيرو — عبر المدير فقط',
    zh: 'Monero — 仅限经理办理',
  } as L,
  sub: {
    en: 'Monero hides amounts and addresses by design, so automatic crediting is impossible. Top-ups in XMR are handled personally by our manager in Telegram.',
    ru: 'Monero по своей природе скрывает суммы и адреса, поэтому автозачисление невозможно. Пополнения в XMR проводит лично наш менеджер в Telegram.',
    uk: 'Monero приховує суми й адреси, тож автозарахування неможливе. Поповнення в XMR проводить особисто наш менеджер у Telegram.',
    es: 'Monero oculta importes y direcciones, por lo que el abono automático es imposible. Las recargas en XMR las gestiona personalmente nuestro manager en Telegram.',
    tr: 'Monero tutarları ve adresleri gizler, bu yüzden otomatik yükleme mümkün değil. XMR yüklemelerini yöneticimiz Telegram üzerinden bizzat yapar.',
    pt: 'A Monero oculta valores e endereços, então o crédito automático é impossível. Recargas em XMR são feitas pessoalmente pelo nosso gerente no Telegram.',
    fr: 'Monero masque montants et adresses, le crédit automatique est donc impossible. Les recharges en XMR sont traitées par notre manager sur Telegram.',
    ar: 'يخفي مونيرو المبالغ والعناوين، لذا الإضافة التلقائية مستحيلة. يتم شحن XMR شخصياً عبر مديرنا على تيليجرام.',
    zh: 'Monero 隐藏金额与地址，无法自动到账。XMR 充值由我们的经理在 Telegram 亲自处理。',
  } as L,
  f1: {
    en: 'Amounts and addresses stay invisible on-chain',
    ru: 'Суммы и адреса не видны в блокчейне',
    uk: 'Суми та адреси не видно в блокчейні',
    es: 'Importes y direcciones invisibles en cadena',
    tr: 'Tutar ve adresler zincirde görünmez',
    pt: 'Valores e endereços invisíveis na rede',
    fr: 'Montants et adresses invisibles on-chain',
    ar: 'المبالغ والعناوين غير مرئية على الشبكة',
    zh: '链上金额与地址不可见',
  } as L,
  f2: {
    en: 'Manual escrow check by a senior operator',
    ru: 'Ручная проверка старшим оператором',
    uk: 'Ручна перевірка старшим оператором',
    es: 'Verificación manual por un operador senior',
    tr: 'Kıdemli operatör tarafından manuel kontrol',
    pt: 'Verificação manual por operador sênior',
    fr: 'Vérification manuelle par un opérateur senior',
    ar: 'تحقق يدوي من مشغل أول',
    zh: '由资深操作员人工核验',
  } as L,
  f3: {
    en: 'Balance credited right after confirmation',
    ru: 'Баланс зачисляется сразу после подтверждения',
    uk: 'Баланс зараховується одразу після підтвердження',
    es: 'Saldo acreditado tras la confirmación',
    tr: 'Onaydan hemen sonra bakiye yüklenir',
    pt: 'Saldo creditado logo após a confirmação',
    fr: 'Solde crédité dès confirmation',
    ar: 'يُضاف الرصيد فور التأكيد',
    zh: '确认后立即到账',
  } as L,
  cta: {
    en: 'Write to the manager',
    ru: 'Написать менеджеру',
    uk: 'Написати менеджеру',
    es: 'Escribir al manager',
    tr: 'Yöneticiye yaz',
    pt: 'Falar com o gerente',
    fr: 'Écrire au manager',
    ar: 'راسل المدير',
    zh: '联系经理',
  } as L,
  other: {
    en: 'Choose another coin',
    ru: 'Выбрать другую монету',
    uk: 'Обрати іншу монету',
    es: 'Elegir otra moneda',
    tr: 'Başka bir coin seç',
    pt: 'Escolher outra moeda',
    fr: 'Choisir une autre crypto',
    ar: 'اختر عملة أخرى',
    zh: '选择其他币种',
  } as L,
  copied: {
    en: 'Handle copied',
    ru: 'Ник скопирован',
    uk: 'Нік скопійовано',
    es: 'Usuario copiado',
    tr: 'Kullanıcı adı kopyalandı',
    pt: 'Usuário copiado',
    fr: 'Identifiant copié',
    ar: 'تم نسخ المعرف',
    zh: '已复制账号',
  } as L,
}

/** Monero logo: soft entrance, slow float, breathing glow and a shine sweep. */
function MoneroCoin3D() {
  return (
    <div className="pointer-events-none relative mx-auto h-[132px] w-[132px]">
      {/* breathing halo */}
      <motion.div
        aria-hidden
        className="absolute inset-3 rounded-full bg-[#FF6600]/30 blur-2xl"
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* expanding rings */}
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute inset-3 rounded-full border border-[#FF6600]/25"
          animate={{ scale: [0.92, 1.35], opacity: [0.5, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: i * 1.8, ease: 'easeOut' }}
        />
      ))}
      {/* logo */}
      <motion.div
        className="absolute inset-3"
        initial={{ scale: 0.6, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.05 }}
      >
        <motion.div
          className="size-full"
          animate={{ y: [0, -6, 0], rotate: [-2.5, 2.5, -2.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ filter: 'drop-shadow(0 18px 26px rgba(255,102,0,0.35))' }}
        >
          <span className="relative block size-full overflow-hidden rounded-full">
            <CoinIcon symbol="XMR" className="size-full" />
            <motion.span
              aria-hidden
              className="absolute -inset-y-12 w-10 rotate-12 bg-white/25 blur-md"
              animate={{ x: ['-80%', '320%'] }}
              transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
            />
          </span>
        </motion.div>
      </motion.div>
    </div>
  )
}



export function MoneroManagerSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { lang } = useI18n()
  useScrollLock(open)
  const tx = (k: keyof typeof COPY) => pick(COPY[k], lang)

  const features = [
    { icon: EyeOff, text: tx('f1') },
    { icon: ShieldCheck, text: tx('f2') },
    { icon: Lock, text: tx('f3') },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%', rotateX: 14, opacity: 0 }}
            animate={{ y: 0, rotateX: 0, opacity: 1 }}
            exit={{ y: '100%', rotateX: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="relative w-full max-w-md overflow-hidden rounded-t-[28px] border border-border bg-card px-5 pb-7 pt-3 [transform-origin:bottom] [transform-style:preserve-3d]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-[#FF6600]/15 blur-3xl"
            />
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-muted-foreground/30" />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground active:scale-90"
            >
              <X className="size-4" />
            </button>

            <MoneroCoin3D />

            <div className="relative mt-1 text-center">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF9A4D]">
                Monero · XMR
              </p>
              <h2 className="font-display mt-2 text-[24px] font-extrabold leading-[1.15] tracking-[-0.02em] text-balance">
                {tx('title')}
              </h2>
              <p className="mx-auto mt-2.5 max-w-[20rem] text-[13.5px] leading-[1.55] text-muted-foreground text-pretty">
                {tx('sub')}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {features.map((f, i) => (
                <motion.div
                  key={f.text}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.08, duration: 0.3 }}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/50 px-3.5 py-3 backdrop-blur-sm"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FF6600]/15 text-[#FF9A4D] ring-1 ring-inset ring-[#FF6600]/25">
                    <f.icon className="size-4.5" />
                  </span>
                  <p className="text-[13px] font-medium leading-snug tracking-[-0.01em]">{f.text}</p>
                </motion.div>
              ))}
            </div>

            <motion.a
              href={TG_URL}
              target="_blank"
              rel="noreferrer"
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="group relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#FF8A3D_0%,#FF6600_45%,#E85A00_100%)] py-4 text-[15px] font-bold tracking-[-0.01em] text-white shadow-[0_20px_40px_-18px_rgba(255,102,0,0.75)] ring-1 ring-inset ring-white/20"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent"
              />
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-y-8 w-16 -rotate-12 bg-white/25 blur-md"
                animate={{ x: ['-120%', '520%'] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
              />
              <span className="relative">{tx('cta')}</span>
              <ArrowUpRight className="relative size-4.5 transition-transform group-active:translate-x-0.5" />
            </motion.a>




          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
