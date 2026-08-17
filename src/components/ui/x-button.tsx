'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'solid' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  // X blue filled
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  // X white filled (the signature "Post" button look)
  solid: 'bg-foreground text-background hover:bg-foreground/90',
  outline:
    'bg-transparent text-foreground border border-border-strong hover:bg-secondary',
  ghost: 'bg-transparent text-foreground hover:bg-secondary',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-[52px] px-6 text-base',
}

interface XButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant
  size?: Size
  block?: boolean
}

export function XButton({
  variant = 'primary',
  size = 'md',
  block,
  className,
  children,
  ...props
}: XButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-full font-bold tracking-tight',
        'disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}
