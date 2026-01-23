'use client'

import { motion, MotionProps, useReducedMotion } from 'motion/react'
import { forwardRef, HTMLAttributes } from 'react'

export interface MotionWrapperProps
  extends Omit<HTMLAttributes<HTMLDivElement>, keyof MotionProps>,
    MotionProps {}

/**
 * Smooth global animation wrapper
 * All animated components should wrap this
 */
export const MotionWrapper = forwardRef<
  HTMLDivElement,
  MotionWrapperProps
>(({ children, transition, style, ...props }, ref) => {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      style={{
        willChange: 'transform, opacity',
        ...style,
      }}
      transition={{
        duration: reduceMotion ? 0 : 0.6,
        ease: [0.22, 1, 0.36, 1], // smooth cubic-bezier (easeOutExpo-like)
        ...transition,
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
})

MotionWrapper.displayName = 'MotionWrapper'
