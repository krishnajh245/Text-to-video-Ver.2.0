import React from 'react'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/utils'
import { InputProps } from '@/types'

const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  className,
  ...props
}) => {
  const hasError = !!error
  
  return (
    <div className="relative">
      <motion.input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'input-base',
          hasError && 'border-plasma-red focus:border-plasma-red focus:ring-plasma-red',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        whileFocus={{ scale: 1.01 }}
        {...props}
      />
      
      {hasError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-6 left-0 flex items-center gap-1 text-sm text-plasma-red"
        >
          <AlertCircle className="h-4 w-4" />
          {error}
        </motion.div>
      )}
    </div>
  )
}

export default Input
