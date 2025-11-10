import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils'
import { ButtonProps } from '@/types'

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  className,
  ...props
}) => {
  const baseClasses = 'btn-base relative overflow-hidden'
  
  const variantClasses = {
    primary: 'bg-aurora-blue text-white hover:bg-aurora-blue/90 aurora-glow',
    secondary: 'bg-transparent border border-aurora-blue text-aurora-blue hover:bg-aurora-blue/10',
    ghost: 'bg-transparent text-aurora-blue hover:bg-aurora-blue/10',
    destructive: 'bg-plasma-red text-white hover:bg-plasma-red/90 plasma-glow'
  }
  
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg'
  }
  
  const isDisabled = disabled || loading
  
  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={onClick}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
        </motion.div>
      )}
      
      <motion.span
        animate={{ opacity: loading ? 0 : 1 }}
        className="flex items-center justify-center gap-2"
      >
        {children}
      </motion.span>
    </motion.button>
  )
}

export default Button
