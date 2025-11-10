import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Video, 
  Grid3X3, 
  Menu, 
  X,
  Zap
} from 'lucide-react'
import { cn } from '@/utils'
import ThemeToggle from './ThemeToggle'

const Navigation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()
  
  const navItems = [
    { label: 'Generate', href: '/', icon: Video },
    { label: 'Gallery', href: '/gallery', icon: Grid3X3 }
  ]
  
  const isActive = (href: string) => location.pathname === href
  
  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-40 bg-deep-space/95 backdrop-blur-md border-b border-nebula-purple/10 light:bg-light-bg/95 light:border-light-border transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="p-2 rounded-lg bg-aurora-blue/10"
            >
              <Zap className="h-6 w-6 text-aurora-blue" />
            </motion.div>
            <span className="text-xl font-bold text-aurora-gradient">
              VisionCraft AI
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200',
                    isActive(item.href)
                      ? 'text-aurora-blue bg-aurora-blue/10 light:text-light-accent light:bg-light-accent/10'
                      : 'text-moon-dust hover:text-starlight hover:bg-cosmic-gray/50 light:text-light-text-secondary light:hover:text-light-text light:hover:bg-light-surface'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-cosmic-gray/50 transition-colors light:hover:bg-light-surface"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-starlight light:text-light-text" />
              ) : (
                <Menu className="h-6 w-6 text-starlight light:text-light-text" />
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <motion.div
          initial={false}
          animate={{
            height: isMobileMenuOpen ? 'auto' : 0,
            opacity: isMobileMenuOpen ? 1 : 0
          }}
          transition={{ duration: 0.3 }}
          className="md:hidden overflow-hidden"
        >
          <div className="py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive(item.href)
                      ? 'text-aurora-blue bg-aurora-blue/10 light:text-light-accent light:bg-light-accent/10'
                      : 'text-moon-dust hover:text-starlight hover:bg-cosmic-gray/50 light:text-light-text-secondary light:hover:text-light-text light:hover:bg-light-surface'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </motion.div>
      </div>
    </motion.nav>
  )
}

export default Navigation
