import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  icon?: ReactNode
  children: ReactNode
  variant?: 'primary' | 'ghost'
  size?: 'lg' | 'md'
}

/** Glowing red-outline call-to-action used for every major interaction. */
export function HeroButton({ icon, children, variant = 'primary', size = 'lg', className = '', ...rest }: Props) {
  const base =
    'hero-button group inline-flex items-center justify-center gap-3 rounded-full font-label font-bold uppercase tracking-[0.22em] select-none cursor-pointer transition-colors'
  const sizes = size === 'lg' ? 'min-h-14 px-8 text-[15px] sm:text-base' : 'min-h-11 px-5 text-[13px]'
  const look =
    variant === 'primary'
      ? 'glow-red bg-[linear-gradient(180deg,rgba(224,24,43,0.28),rgba(120,8,18,0.35))] text-white hover:bg-[linear-gradient(180deg,rgba(255,46,68,0.45),rgba(150,10,22,0.5))]'
      : 'border border-white/15 bg-white/5 text-silver/90 hover:border-spidey-hot/60 hover:text-white backdrop-blur-md'
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`${base} ${sizes} ${look} ${className}`}
      {...rest}
    >
      {icon ? <span className="grid place-items-center transition-transform group-hover:-rotate-12">{icon}</span> : null}
      <span>{children}</span>
    </motion.button>
  )
}
