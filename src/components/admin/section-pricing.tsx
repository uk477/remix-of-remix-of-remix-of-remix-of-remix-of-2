'use client'

import { useEffect, useState } from 'react'
import { Percent, RotateCcw, Save } from 'lucide-react'
import { usePricing } from '@/lib/pricing'
import {
  DEFAULT_DATED_MARKUP,
  DEFAULT_FRESH_MARKUP,
  DEFAULT_MIN_PRICE,
  SUPPLIER_FRESH,
  SUPPLIER_OLD_DATED,
  retailPrice,
} from '@/lib/supplier-twitter'
import { money } from '@/lib/format'
import { useToast } from '../toast'
import { Card, Field, GhostButton, PrimaryButton, ReadRow, SectionHeader, TextIn } from './primitives'

const num = (v: string, fallback: number) => {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export function PricingSection() {
  const { settings, loading, version, save } = usePricing()
  const { show: toast } = useToast()
  const [fresh, setFresh] = useState('')
  const [dated, setDated] = useState('')
  const [min, setMin] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFresh(String(settings.fresh))
    setDated(String(settings.dated))
    setMin(String(settings.min))
  }, [settings.fresh, settings.dated, settings.min])

  const freshN = num(fresh, settings.fresh)
  const datedN = num(dated, settings.dated)
  const minN = num(min, settings.min)

  const datedBase = Math.min(...SUPPLIER_OLD_DATED.filter((y) => y.stock > 0).map((y) => y.base))

  const onSave = async () => {
    if (freshN <= 0 || datedN <= 0) {
      toast('Наценка должна быть больше нуля', { variant: 'error' })
      return
    }
    setSaving(true)
    const res = await save({ fresh_markup: freshN, dated_markup: datedN, min_price: minN })
    setSaving(false)
    if (res.ok) toast('Наценка обновлена — цены пересчитаны', { variant: 'success' })
    else toast(res.error ?? 'Не удалось сохранить', { variant: 'error' })
  }

  const onReset = () => {
    setFresh(String(DEFAULT_FRESH_MARKUP))
    setDated(String(DEFAULT_DATED_MARKUP))
    setMin(String(DEFAULT_MIN_PRICE))
  }

  return (
    <div key={version}>
      <SectionHeader
        title="Наценка"
        subtitle="Множители к цене поставщика. Применяются мгновенно, без перезапуска."
      />

      <Card>
        <div className="grid gap-3">
          <Field label="Fresh аккаунты (×)" hint="Цена поставщика × множитель. По умолчанию 2.5">
            <TextIn value={fresh} onChange={setFresh} placeholder="2.5" />
          </Field>
          <Field label="Old Dated аккаунты (×)" hint="По умолчанию 2.0">
            <TextIn value={dated} onChange={setDated} placeholder="2" />
          </Field>
          <Field label="Минимальная цена, $" hint="Ниже этой суммы розничная цена не опускается">
            <TextIn value={min} onChange={setMin} placeholder="0.15" />
          </Field>
        </div>

        <div className="mt-4 flex gap-2">
          <PrimaryButton onClick={onSave} loading={saving} disabled={loading} icon={Save}>
            Сохранить
          </PrimaryButton>
          <GhostButton onClick={onReset} icon={RotateCcw}>
            По умолчанию
          </GhostButton>
        </div>
      </Card>

      <div className="mt-3">
        <Card>
          <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Percent className="h-3 w-3" strokeWidth={2.5} />
            Предпросмотр
          </p>
          <ReadRow
            label={`Fresh · закуп ${money(SUPPLIER_FRESH.base)}`}
            value={money(retailPrice(SUPPLIER_FRESH.base, 'fresh'))}
            mono
          />
          <ReadRow
            label={`Old Dated · закуп от ${money(datedBase)}`}
            value={money(retailPrice(datedBase, 'dated'))}
            mono
          />
          <ReadRow
            label="Old Dated 2007 · закуп $10.00"
            value={money(retailPrice(10, 'dated'))}
            mono
          />
        </Card>
      </div>
    </div>
  )
}
