import React from 'react'
import { motion } from 'framer-motion'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { cn } from '@/utils'

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
  animation?: 'fadeUp' | 'fadeLeft' | 'fadeRight' | 'scale' | 'float'
  delay?: number
  duration?: number
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className,
  animation = 'fadeUp',
  delay = 0,
  duration = 0.6
}) => {
  const { ref, isVisible } = useScrollAnimation()

  const animationVariants = {
    fadeUp: {
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0 }
    },
    fadeLeft: {
      hidden: { opacity: 0, x: -30 },
      visible: { opacity: 1, x: 0 }
    },
    fadeRight: {
      hidden: { opacity: 0, x: 30 },
      visible: { opacity: 1, x: 0 }
    },
    scale: {
      hidden: { opacity: 0, scale: 0.9 },
      visible: { opacity: 1, scale: 1 }
    },
    float: {
      hidden: { opacity: 0, y: 20 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: {
          type: "spring",
          stiffness: 100,
          damping: 12
        }
      }
    }
  }

  return (
    <motion.div
      ref={ref as React.Ref<HTMLDivElement>}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={animationVariants[animation]}
      transition={{
        duration,
        delay,
        ease: "easeOut"
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedSection
