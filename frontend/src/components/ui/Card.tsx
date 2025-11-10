import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils'
import { CardProps } from '@/types'

const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = true,
  glow,
  ...props
}) => {
  const glowClasses = {
    aurora: 'hover:shadow-aurora',
    nebula: 'hover:shadow-nebula',
    quantum: 'hover:shadow-quantum',
    plasma: 'hover:shadow-plasma'
  }
  
  return (
    <motion.div
      className={cn(
        'card-base',
        hover && 'hover:scale-[1.02] hover:-translate-y-1',
        glow && glowClasses[glow],
        className
      )}
      whileHover={hover ? { y: -2 } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export default Card
