import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  color?: 'aurora' | 'nebula' | 'quantum' | 'plasma'
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  color = 'aurora'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }
  
  const colorClasses = {
    aurora: 'text-aurora-blue',
    nebula: 'text-nebula-purple',
    quantum: 'text-quantum-green',
    plasma: 'text-plasma-red'
  }
  
  return (
    <motion.div
      className={cn(
        'animate-spin rounded-full border-2 border-transparent border-t-current',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  )
}

export default Spinner
