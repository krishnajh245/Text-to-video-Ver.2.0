import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className
}) => {
  const variantClasses = {
    default: 'bg-cosmic-gray text-starlight border-nebula-purple/20',
    success: 'bg-quantum-green/20 text-quantum-green border-quantum-green/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    error: 'bg-plasma-red/20 text-plasma-red border-plasma-red/30',
    info: 'bg-aurora-blue/20 text-aurora-blue border-aurora-blue/30'
  }
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }
  
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </motion.span>
  )
}

export default Badge
