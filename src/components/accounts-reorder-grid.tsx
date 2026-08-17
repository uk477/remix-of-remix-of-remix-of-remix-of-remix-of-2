'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { GripVertical, ArrowLeftRight, Check, X } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { reorderFollowerAccounts, swapFollowerAccounts } from '@/lib/follower-accounts'
import type { AgedAccount } from '@/lib/types'
import { TOPICS, TOPIC_ROTATION, isTopicId, type TopicId } from '@/lib/topics'

export type ReorderMode = 'off' | 'drag' | 'swap'

/* ----------------------------- Toolbar ----------------------------- */

export function ReorderToolbar({
  mode,
  onChange,
  labels,
}: {
  mode: ReorderMode
  onChange: (m: ReorderMode) => void
  labels: { drag: string; swap: string; done: string }
}) {
  if (mode === 'off') return null
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-primary/30 bg-primary/10 px-4 py-2 backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
        {mode === 'drag' ? (
          <>
            <GripVertical className="size-4" />
            <span>{labels.drag}</span>
          </>
        ) : (
          <>
            <ArrowLeftRight className="size-4" />
            <span>{labels.swap}</span>
          </>
        )}
      </div>
      <button
        onClick={() => onChange('off')}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-primary/50 bg-background/70 px-3 text-[12px] font-semibold text-primary"
      >
        <Check className="size-3.5" />
        {labels.done}
      </button>
    </div>
  )
}

/* ---------------------- Sortable card wrapper ---------------------- */

function SortableCard({
  account,
  children,
}: {
  account: AgedAccount
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: account.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.85 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative touch-none ${isDragging ? 'scale-[1.04]' : ''}`}
    >
      <div className="pointer-events-none absolute left-1.5 top-1.5 z-20 flex size-7 items-center justify-center rounded-lg border border-primary/60 bg-background/85 text-primary shadow-lg backdrop-blur">
        <GripVertical className="size-3.5" strokeWidth={2.4} />
      </div>
      {children}
    </div>
  )
}

/* --------------------------- DRAG GRID ----------------------------- */

export function DragReorderGrid({
  list,
  renderCard,
  onError,
}: {
  list: AgedAccount[]
  renderCard: (a: AgedAccount, i: number) => React.ReactNode
  onError?: (msg: string) => void
}) {
  const [items, setItems] = useState<AgedAccount[]>(list)

  // Keep local state in sync when the parent list changes (topic/edit/delete).
  // Adjusting state during render is the React-sanctioned pattern here; doing
  // it inside useMemo is not guaranteed to run under concurrent rendering.
  const idsKey = list.map((a) => a.id).join('|')
  const prevIdsRef = useRef(idsKey)
  if (prevIdsRef.current !== idsKey) {
    prevIdsRef.current = idsKey
    setItems(list)
  }


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  )

  const handleEnd = async (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((a) => a.id === active.id)
    const newIndex = items.findIndex((a) => a.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)
    try {
      await reorderFollowerAccounts(next.map((a) => a.id))
    } catch (err) {
      console.error('[reorder]', err)
      onError?.('Не удалось сохранить порядок')
      setItems(list)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
      <SortableContext items={items.map((a) => a.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 px-4 pb-8 pt-3">
          {items.map((a, i) => (
            <SortableCard key={a.id} account={a}>
              {renderCard(a, i)}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

/* --------------------------- SWAP GRID ----------------------------- */

export function SwapGrid({
  list,
  renderCard,
  onError,
}: {
  list: AgedAccount[]
  renderCard: (a: AgedAccount, i: number) => React.ReactNode
  onError?: (msg: string) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onPick = async (id: string) => {
    if (busy) return
    if (selected === id) {
      setSelected(null)
      return
    }
    if (!selected) {
      setSelected(id)
      return
    }
    setBusy(true)
    const a = selected
    const b = id
    setSelected(null)
    try {
      await swapFollowerAccounts(a, b)
    } catch (err) {
      console.error('[swap]', err)
      onError?.('Не удалось поменять местами')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-8 pt-3">
      {list.map((a, i) => {
        const isSel = selected === a.id
        const primary = (a.topicIds?.find(isTopicId) as TopicId | undefined) ??
          (isTopicId(a.topicId) ? (a.topicId as TopicId) : TOPIC_ROTATION[0])
        const topic = TOPICS[primary]
        return (
          <motion.button
            key={a.id}
            type="button"
            onClick={() => onPick(a.id)}
            whileTap={{ scale: 0.96 }}
            className={`relative rounded-2xl outline-none transition-all ${
              isSel
                ? 'ring-2 ring-primary shadow-[0_0_0_4px_oklch(0.78_0.18_60_/_0.25)]'
                : ''
            }`}
            style={isSel ? { boxShadow: `0 0 24px ${topic.glow}` } : undefined}
            disabled={busy}
          >
            <div className="pointer-events-none absolute left-1.5 top-1.5 z-20 flex size-7 items-center justify-center rounded-lg border border-primary/60 bg-background/85 text-primary shadow-lg backdrop-blur">
              {isSel ? (
                <Check className="size-3.5" strokeWidth={2.6} />
              ) : (
                <ArrowLeftRight className="size-3.5" strokeWidth={2.4} />
              )}
            </div>
            <div className="pointer-events-none">{renderCard(a, i)}</div>
          </motion.button>
        )
      })}
      {busy && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-xl border border-primary/40 bg-background/90 px-4 py-2 text-[13px] font-semibold text-primary">
            <X className="hidden" />
            Меняем местами…
          </div>
        </div>
      )}
    </div>
  )
}
