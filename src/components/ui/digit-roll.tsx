'use client'

import { motion } from 'framer-motion'

/**
 * Reusable slot-machine digit roller. Renders a fixed-width span per
 * character; digits 0-9 slide vertically to the target value using a
 * spring, non-digits (commas, spaces, K etc.) render inline as text.
 */
export function DigitRoll({
  digits,
  fontSize = 14,
  color = 'white',
  fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}: {
  digits: string[]
  fontSize?: number
  color?: string
  fontFamily?: string
}) {
  return (
    <span
      className="tnum inline-flex items-baseline font-bold"
      style={{ fontSize, fontFamily, color }}
    >
      {digits.map((d, i) => {
        if (!/\d/.test(d)) {
          return (
            <span key={`s-${i}`} className="opacity-70">
              {d}
            </span>
          )
        }
        return (
          <span
            key={`d-${i}-${digits.length}`}
            className="relative inline-block overflow-hidden"
            style={{ height: '1em', width: '0.62em' }}
          >
            <motion.span
              className="absolute inset-x-0 flex flex-col items-center"
              animate={{ y: `-${Number(d) * 10}%` }}
              transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 0.6 }}
            >
              {Array.from({ length: 10 }).map((_, n) => (
                <span key={n} style={{ height: '1em', lineHeight: '1em' }}>
                  {n}
                </span>
              ))}
            </motion.span>
          </span>
        )
      })}
    </span>
  )
}
