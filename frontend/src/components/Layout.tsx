import React from 'react'
import { motion } from 'framer-motion'
import Navigation from './Navigation'
import { cn } from '@/utils'

interface LayoutProps {
  children: React.ReactNode
  className?: string
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  return (
    <div className="min-h-screen bg-deep-space">
      <Navigation />
      
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={cn('pt-16', className)}
      >
        {children}
      </motion.main>
    </div>
  )
}

export default Layout
