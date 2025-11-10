import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils'

interface EnhancedCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: 'aurora' | 'nebula' | 'quantum' | 'plasma' | 'none'
  gradient?: boolean
  animated?: boolean
  delay?: number
}

const EnhancedCard: React.FC<EnhancedCardProps> = ({
  children,
  className,
  hover = true,
  glow = 'none',
  gradient = false,
  animated = true,
  delay = 0
}) => {
  const glowClasses = {
    aurora: 'hover:shadow-aurora light:hover:shadow-lg',
    nebula: 'hover:shadow-nebula light:hover:shadow-lg',
    quantum: 'hover:shadow-quantum light:hover:shadow-lg',
    plasma: 'hover:shadow-plasma light:hover:shadow-lg',
    none: ''
  }
  
  const gradientClasses = gradient 
    ? 'bg-gradient-to-br from-cosmic-gray via-cosmic-gray to-nebula-purple/5 light:from-light-card light:via-light-card light:to-light-accent/5'
    : 'bg-cosmic-gray light:bg-light-card'
  
  return (
    <motion.div
      className={cn(
        'card-base relative overflow-hidden',
        gradientClasses,
        hover && 'hover:scale-[1.02] hover:-translate-y-1',
        glowClasses[glow],
        className
      )}
      initial={animated ? { opacity: 0, y: 20 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      transition={animated ? { duration: 0.5, delay } : {}}
      whileHover={hover ? { y: -2 } : {}}
    >
      {/* Animated background gradient */}
      {gradient && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-aurora-blue/5 via-transparent to-nebula-purple/5 light:from-light-accent/5 light:to-light-accent-purple/5"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Subtle border animation */}
      {glow !== 'none' && (
        <motion.div
          className="absolute inset-0 rounded-xl border border-transparent"
          style={{
            background: `linear-gradient(${gradientClasses}, ${gradientClasses}) padding-box, 
                        linear-gradient(45deg, transparent, var(--glow-color), transparent) border-box`
          }}
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      )}
    </motion.div>
  )
}

export default EnhancedCard
