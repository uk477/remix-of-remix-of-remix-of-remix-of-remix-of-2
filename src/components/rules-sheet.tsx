'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BookOpen,
  HelpCircle,
  KeyRound,
  Shield,
  Zap,
} from 'lucide-react'

import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/lib/i18n'

interface SectionDef {
  key: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  borderColor: string
}

const SECTIONS: SectionDef[] = [
  {
    key: 'login',
    icon: Shield,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/12',
    borderColor: 'border-amber-500/40',
  },
  {
    key: 'replacement',
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/12',
    borderColor: 'border-orange-500/40',
  },
  {
    key: 'format',
    icon: KeyRound,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/12',
    borderColor: 'border-sky-500/40',
  },
  {
    key: 'boost',
    icon: Zap,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/12',
    borderColor: 'border-rose-500/40',
  },
  {
    key: 'collab',
    icon: HelpCircle,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/12',
    borderColor: 'border-violet-500/40',
  },
]

export function RulesSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { t, dir } = useI18n()

  const isRTL = dir === 'rtl'

  const renderedSections = useMemo(
    () =>
      SECTIONS.map((s) => {
        const titleKey = `rules_${s.key}_title` as keyof typeof t extends string
          ? string
          : never
        const textKey = `rules_${s.key}_text` as keyof typeof t extends string
          ? string
          : never
        return {
          ...s,
          title: t(titleKey as never),
          lines: t(textKey as never).split('\n'),
        }
      }),
    [t],
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[92dvh] flex-col rounded-t-3xl border-t border-primary/25 bg-[#0b0b0d] p-0 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)]"
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-white/15" />
        </div>

        {/* header */}
        <div className="flex items-center gap-3 px-5 pb-4 pt-1">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
            <BookOpen className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-[17px] font-bold tracking-tight">
              {t('rules_title' as never)}
            </h2>
            <p className="text-[11px] font-medium text-white/35">
              AureX Agency
            </p>
          </div>
        </div>

        {/* scrollable body */}
        <ScrollArea className="min-h-0 flex-1 px-5 pb-8">
          <div className="space-y-3">
            {renderedSections.map((section, i) => (
              <motion.div
                key={section.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.05,
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1] as const,
                }}
                className={`rounded-2xl border bg-white/[0.03] p-4 backdrop-blur-sm ${isRTL ? `border-r-2 ${section.borderColor.replace('border-l', 'border-r')}` : `border-l-2 ${section.borderColor}`}`}
              >
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span
                    className={`flex size-8 items-center justify-center rounded-lg ${section.iconBg}`}
                  >
                    <section.icon
                      className={`size-4 ${section.iconColor}`}
                      strokeWidth={2.2}
                    />
                  </span>
                  <h3 className="text-sm font-bold tracking-tight">
                    {section.title}
                  </h3>
                </div>
                <div className="space-y-1">
                  {section.lines.map((line, j) => {
                    if (!line.trim()) {
                      return <div key={j} className="h-2" />
                    }
                    const isBullet = line.trim().startsWith('•')
                    const isWarning = line.trim().startsWith('⚠️')
                    const isMail = line.trim().startsWith('📩')
                    const isBang = line.includes('!!!')
                    return (
                      <p
                        key={j}
                        className={`text-[13px] leading-relaxed ${isBang ? 'font-bold text-rose-300' : isWarning ? 'font-semibold text-amber-300' : isMail ? 'font-medium text-sky-300' : 'text-white/75'} ${isBullet ? (isRTL ? 'pr-3' : 'pl-3') : ''}`}
                      >
                        {line}
                      </p>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* footer spacer */}
          <div className="h-4" />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
