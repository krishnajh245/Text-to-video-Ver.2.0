import React from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/utils'

interface ThemeToggleProps {
  className?: string
  showLabels?: boolean
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className, 
  showLabels = false 
}) => {
  const { theme, toggleTheme } = useTheme()

  const themes = [
    { key: 'light', icon: Sun, label: 'Light' },
    { key: 'dark', icon: Moon, label: 'Dark' }
  ] as const

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {showLabels && (
        <span className="text-sm text-moon-dust mr-2">Theme:</span>
      )}
      
      <div className="flex items-center bg-cosmic-gray rounded-lg p-1">
        {themes.map(({ key, icon: Icon, label }) => (
          <motion.button
            key={key}
            onClick={() => theme !== key && toggleTheme()}
            className={cn(
              'relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
              theme === key
                ? 'text-starlight'
                : 'text-moon-dust hover:text-starlight'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {theme === key && (
              <motion.div
                layoutId="theme-indicator"
                className="absolute inset-0 bg-aurora-blue/20 rounded-md"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            
            <Icon className="h-4 w-4 relative z-10" />
            {showLabels && (
              <span className="relative z-10">{label}</span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default ThemeToggle
