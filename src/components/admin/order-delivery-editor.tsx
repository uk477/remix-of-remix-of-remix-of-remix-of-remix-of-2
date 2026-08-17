'use client'

/**
 * Per-order delivery composer. The admin decides, for every delivered account,
 * WHICH fields the buyer receives and in WHAT order — pick from the catalogue,
 * fill the values, reorder with the arrows. The chosen order is persisted with
 * the account payload, so the buyer's card mirrors it exactly.
 */
import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react'
import {
  FIELDS_ORDER_KEY,
  MAIL_PROVIDERS,
  MAIL_PROVIDER_KEY,
  effectiveMailProvider as mailProvider,
  type MailProvider,
  FIELD_ORDER,
  SECRET_FIELDS,
  fieldLabel,
  LABELS_KEY,
  isReservedKey,
  accountLabels,
  customFieldKey,
  type DeliveredAccount,
  type FieldKey,
} from '@/lib/order-delivery'
import { Field, GhostButton, PrimaryButton } from './primitives'

/** Sensible starting set for a fresh account row. */
const DEFAULT_FIELDS: FieldKey[] = ['username', 'password']

type Draft = {
  fields: FieldKey[]
  values: Record<string, string>
  /** Admin-chosen captions, per field. Empty → buyer sees the raw key. */
  labels: Record<string, string>
  mail: MailProvider | null
}

/** Exactly what the buyer will read above the value. */
function shownLabel(d: Draft, f: FieldKey): string {
  return (d.labels[f] ?? '').trim() || f
}

function toDraft(acc: DeliveredAccount): Draft {
  const raw = acc[FIELDS_ORDER_KEY]
  const present = Object.keys(acc).filter((k) => !isReservedKey(k))
  const ordered = raw
    ? raw
        .split(',')
        .map((s) => s.trim())
        .filter((f) => f !== '' && !isReservedKey(f))
    : [
        ...FIELD_ORDER.filter((f) => acc[f] !== undefined),
        ...present.filter((k) => !FIELD_ORDER.includes(k)),
      ]
  const values: Record<string, string> = {}
  present.forEach((k) => (values[k] = acc[k]!))
  return {
    fields: ordered.length ? ordered : DEFAULT_FIELDS,
    values,
    labels: accountLabels(acc),
    mail: mailProvider(acc),
  }
}

function fromDraft(d: Draft): DeliveredAccount {
  const out: DeliveredAccount = {}
  const kept = d.fields.filter((f) => (d.values[f] ?? '').trim() !== '')
  kept.forEach((f) => (out[f] = (d.values[f] ?? '').trim()))
  out[FIELDS_ORDER_KEY] = kept.join(',')
  const labels: Record<string, string> = {}
  kept.forEach((f) => {
    const custom = (d.labels[f] ?? '').trim()
    if (custom) labels[f] = custom
  })
  if (Object.keys(labels).length) out[LABELS_KEY] = JSON.stringify(labels)
  if (d.mail) out[MAIL_PROVIDER_KEY] = d.mail
  return out
}

export function OrderDeliveryEditor({
  accounts,
  qty,
  onSave,
}: {
  accounts: DeliveredAccount[]
  qty: number
  onSave: (accounts: DeliveredAccount[]) => boolean | Promise<boolean>
}) {
  const initial = useMemo<Draft[]>(() => {
    if (accounts.length) return accounts.map(toDraft)
    return Array.from({ length: Math.max(1, qty || 1) }, () => ({
      fields: DEFAULT_FIELDS,
      values: {},
      labels: {},
      mail: null,
    }))
  }, [accounts, qty])

  const [drafts, setDrafts] = useState<Draft[]>(initial)
  const [picker, setPicker] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  // Everything already handed over to the buyer, as stored. Shown read-only so
  // the admin can always audit what the client sees before touching anything.
  const issued = useMemo(
    () =>
      accounts
        .map((acc) => {
          const d = toDraft(acc)
          const id = mailProvider(acc)
          return {
            mail: id ? (MAIL_PROVIDERS.find((p) => p.id === id)?.host ?? null) : null,
            rows: d.fields
              .filter((f) => (d.values[f] ?? '').trim() !== '')
              .map((f) => ({ key: f, label: shownLabel(d, f), value: d.values[f]!.trim() })),
          }
        })
        .filter((x) => x.rows.length > 0),
    [accounts],
  )

  const [editing, setEditing] = useState(issued.length === 0)

  // Keep the editor aligned when fresh delivery data arrives for the same
  // open order (save, background refresh, or another admin update).
  const accountsSignature = JSON.stringify(accounts)
  useEffect(() => {
    setDrafts(initial)
    setPicker(null)
    setSaved(false)
    setEditing(issued.length === 0)
  }, [accountsSignature, initial, issued.length])

  if (issued.length > 0 && !editing) {
    return (
      <Field
        label="Выдано покупателю"
        hint="Ровно эти поля и значения видит клиент в своём заказе. Нажмите «Изменить», чтобы поправить."
      >
        <div className="space-y-2.5">
          {issued.map(({ rows, mail }, i) => (
            <div key={i} className="rounded-[18px] border border-border-strong bg-card p-3">
              <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Аккаунт {String(i + 1).padStart(2, '0')}
                {mail ? (
                  <span className="ml-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] tracking-normal text-primary">
                    {mail}
                  </span>
                ) : null}
              </p>
              <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background/40">
                {rows.map((r) => (
                  <div key={r.key} className="flex items-center gap-3 px-3 py-2">
                    <span className="w-[38%] shrink-0 truncate text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {r.label}
                    </span>
                    <span className="min-w-0 flex-1 break-all font-mono text-[12px] text-foreground">
                      {r.value}
                    </span>
                    <button
                      onClick={() => void navigator.clipboard?.writeText(r.value)}
                      aria-label="Скопировать"
                      className="pressable shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary"
                    >
                      копи
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <GhostButton
            onClick={() => {
              setDrafts(accounts.map(toDraft))
              setSaved(false)
              setEditing(true)
            }}
            icon={Pencil}
            size="sm"
          >
            Изменить выданные данные
          </GhostButton>
        </div>
      </Field>
    )
  }


  function patch(i: number, next: Partial<Draft>) {
    setSaved(false)
    setDrafts((d) => d.map((row, idx) => (idx === i ? { ...row, ...next } : row)))
  }

  function move(i: number, f: FieldKey, dir: -1 | 1) {
    const row = drafts[i]!
    const pos = row.fields.indexOf(f)
    const to = pos + dir
    if (pos < 0 || to < 0 || to >= row.fields.length) return
    const fields = [...row.fields]
    const tmp = fields[pos]!
    fields[pos] = fields[to]!
    fields[to] = tmp
    patch(i, { fields })
  }

  function addField(i: number, f: FieldKey) {
    const row = drafts[i]!
    if (row.fields.includes(f)) return
    patch(i, { fields: [...row.fields, f] })
  }

  function removeField(i: number, f: FieldKey) {
    const row = drafts[i]!
    patch(i, {
      fields: row.fields.filter((x) => x !== f),
      values: { ...row.values, [f]: '' },
    })
  }

  const filled = drafts.reduce(
    (n, d) => n + d.fields.filter((f) => (d.values[f] ?? '').trim() !== '').length,
    0,
  )

  return (
    <Field
      label="Выдача данных клиенту"
      hint="Выберите поля для каждого аккаунта и заполните значения — покупатель увидит ровно их, в этом же порядке."
    >
      <div className="space-y-3">
        {drafts.map((row, i) => (
          <div
            key={i}
            className="rounded-[18px] border border-border-strong bg-card p-3 transition-colors duration-300 hover:border-primary/25"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Аккаунт {String(i + 1).padStart(2, '0')}
              </p>

              {drafts.length > 1 && (
                <button
                  onClick={() => {
                    setSaved(false)
                    setDrafts((d) => d.filter((_, idx) => idx !== i))
                  }}
                  aria-label="Удалить аккаунт"
                  className="pressable flex size-6 items-center justify-center rounded-md border border-border text-muted-foreground"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>

            <div className="mb-2.5 rounded-xl border border-border bg-background/40 p-2">
              <p className="mb-1.5 text-[8.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Почта аккаунта · инструкция «как войти»
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MAIL_PROVIDERS.map((p) => {
                  const on = row.mail === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => patch(i, { mail: on ? null : p.id })}
                      className={`pressable rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        on
                          ? 'border-primary/60 bg-primary/12 text-primary'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {p.host}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1.5 text-[9.5px] leading-snug text-muted-foreground">
                {row.mail
                  ? 'Клиент увидит кнопку «Как войти в почту?» с инструкцией под этот сервис.'
                  : 'Без выбора кнопка «Как войти в почту?» у клиента не появится.'}
              </p>
            </div>

            <div className="space-y-1.5">
              {row.fields.map((f, pos) => (
                <div key={f} className="flex items-center gap-1.5">
                  <div className="flex flex-col">
                    <button
                      onClick={() => move(i, f, -1)}
                      disabled={pos === 0}
                      aria-label="Выше"
                      className="pressable flex h-4 w-5 items-center justify-center rounded-t border border-border text-muted-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="size-2.5" />
                    </button>
                    <button
                      onClick={() => move(i, f, 1)}
                      disabled={pos === row.fields.length - 1}
                      aria-label="Ниже"
                      className="pressable flex h-4 w-5 items-center justify-center rounded-b border border-t-0 border-border text-muted-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="size-2.5" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Tag className="size-2.5 shrink-0 text-primary/70" />
                      <input
                        value={row.labels[f] ?? ''}
                        onChange={(e) => {
                          setSaved(false)
                          setDrafts((d) =>
                            d.map((r, idx) =>
                              idx === i
                                ? { ...r, labels: { ...r.labels, [f]: e.target.value } }
                                : r,
                            ),
                          )
                        }}
                        placeholder={f}
                        aria-label="Название поля для клиента"
                        className="min-w-0 flex-1 bg-transparent text-[8.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground outline-none placeholder:text-muted-foreground/60 focus:text-primary"
                      />
                      {SECRET_FIELDS.has(f) ? (
                        <span className="shrink-0 text-[8px] uppercase tracking-[0.1em] text-muted-foreground/70">
                          скрытое
                        </span>
                      ) : null}
                    </div>
                    <input
                      value={row.values[f] ?? ''}
                      onChange={(e) => {
                        setSaved(false)
                        setDrafts((d) =>
                          d.map((r, idx) =>
                            idx === i ? { ...r, values: { ...r.values, [f]: e.target.value } } : r,
                          ),
                        )
                      }}
                      placeholder={f}
                      className="w-full bg-transparent font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <button
                    onClick={() => removeField(i, f)}
                    aria-label="Убрать поле"
                    className="pressable flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>

            {picker === i ? (
              <div className="mt-2 rounded-lg border border-border-strong bg-background p-2">
                <div className="flex flex-wrap gap-1.5">
                  {FIELD_ORDER.filter((f) => !row.fields.includes(f)).map((f) => (
                    <button
                      key={f}
                      onClick={() => addField(i, f)}
                      className="pressable rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                    >
                      {fieldLabel(f, 'ru')}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const key = customFieldKey(row.fields)
                    patch(i, {
                      fields: [...row.fields, key],
                      labels: { ...row.labels, [key]: '' },
                    })
                    setPicker(null)
                  }}
                  className="pressable mt-2 flex w-full items-center justify-center gap-1 rounded-full border border-primary/50 bg-primary/10 py-1.5 text-[11px] font-semibold text-primary"
                >
                  <Plus className="size-3" /> Своё поле (любое название)
                </button>
                <button
                  onClick={() => setPicker(null)}
                  className="mt-2 w-full text-[11px] font-semibold text-muted-foreground"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPicker(i)}
                className="pressable mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong py-1.5 text-[11px] font-semibold text-muted-foreground"
              >
                <Plus className="size-3" /> Добавить поле
              </button>
            )}
          </div>
        ))}

        <GhostButton
          onClick={() => {
            setSaved(false)
            setDrafts((d) => [...d, { fields: DEFAULT_FIELDS, values: {}, labels: {}, mail: null }])
          }}
          icon={Plus}
          size="sm"
        >
          Ещё аккаунт
        </GhostButton>

        <PrimaryButton
          onClick={() => {
            void (async () => {
              const next = drafts.map(fromDraft)
               const didSave = await onSave(next)
               if (!didSave) return
              setSaved(true)
              if (next.some((a) => Object.keys(a).some((k) => k !== FIELDS_ORDER_KEY)))
                setEditing(false)
            })()
          }}
          icon={saved ? Check : undefined}
        >
          {saved ? 'Данные выданы' : `Выдать данные (${filled} полей)`}
        </PrimaryButton>

      </div>
    </Field>
  )
}
