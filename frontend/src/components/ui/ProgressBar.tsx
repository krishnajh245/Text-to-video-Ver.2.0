import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showPercentage?: boolean
  animated?: boolean
  glow?: boolean
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className,
  showPercentage = true,
  animated = true,
  glow = true
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  return (
    <div className={cn('relative w-full', className)}>
      <div className="h-2 w-full rounded-full bg-cosmic-gray overflow-hidden">
        <motion.div
          className={cn(
            'h-full bg-gradient-to-r from-aurora-blue to-nebula-purple rounded-full',
            glow && 'shadow-aurora'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ 
            duration: animated ? 0.5 : 0,
            ease: 'easeOut'
          }}
        />
      </div>
      
      {showPercentage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-sm text-moon-dust text-center"
        >
          {Math.round(percentage)}%
        </motion.div>
      )}
    </div>
  )
}

export default ProgressBar
