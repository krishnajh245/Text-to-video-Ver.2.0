import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Cpu, 
  Monitor, 
  Zap, 
  Gauge,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import { HardwareInfo } from '@/types'

// Mock hardware detection - in real app this would come from API
const mockHardwareInfo: HardwareInfo = {
  gpu: {
    available: true,
    name: 'NVIDIA GeForce RTX 4080',
    memory: {
      total: 16384, // MB
      allocated: 2048,
      cached: 1024
    }
  },
  cpu: {
    cores: 16,
    threads: 32,
    name: 'AMD Ryzen 9 7950X'
  },
  performance: {
    level: 'high',
    estimatedGenerationTime: 45 // seconds for 24 frames at 512px
  }
}

const HardwarePage: React.FC = () => {
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const detectHardware = async () => {
    setIsDetecting(true)
    
    // Simulate hardware detection delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setHardwareInfo(mockHardwareInfo)
    setLastUpdated(new Date())
    setIsDetecting(false)
  }
  
  useEffect(() => {
    detectHardware()
  }, [])
  
  // kept for potential future use; currently unused
  
  const getPerformanceIcon = (level: string) => {
    switch (level) {
      case 'high': return <CheckCircle className="h-5 w-5 text-quantum-green" />
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-400" />
      case 'low': return <XCircle className="h-5 w-5 text-plasma-red" />
      default: return <AlertTriangle className="h-5 w-5 text-moon-dust" />
    }
  }
  
  const formatMemory = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`
    }
    return `${mb} MB`
  }
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }
  
  return (
    <div className="min-h-screen bg-deep-space py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Cpu className="h-8 w-8 text-aurora-blue" />
                <h1 className="text-3xl font-bold text-starlight">Hardware Detection</h1>
              </div>
              <p className="text-moon-dust">
                Monitor your system's hardware capabilities and performance for AI video generation
              </p>
            </div>
            
            <Button
              onClick={detectHardware}
              disabled={isDetecting}
              loading={isDetecting}
              variant="secondary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isDetecting ? 'Detecting...' : 'Refresh'}
            </Button>
          </div>
          
          {lastUpdated && (
            <p className="text-sm text-moon-dust mt-2">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </motion.div>
        
        {isDetecting ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Card className="max-w-md mx-auto">
              <div className="flex items-center justify-center mb-4">
                <RefreshCw className="h-8 w-8 text-aurora-blue animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-starlight mb-2">
                Detecting Hardware
              </h3>
              <p className="text-moon-dust">
                Scanning your system for GPU and CPU capabilities...
              </p>
            </Card>
          </motion.div>
        ) : hardwareInfo ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Performance Overview */}
            <motion.div variants={itemVariants}>
              <Card glow="aurora">
                <div className="flex items-center gap-3 mb-6">
                  <Gauge className="h-6 w-6 text-aurora-blue" />
                  <h2 className="text-2xl font-semibold text-starlight">Performance Overview</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {getPerformanceIcon(hardwareInfo.performance.level)}
                    </div>
                    <h3 className="text-lg font-semibold text-starlight mb-1">
                      Performance Level
                    </h3>
                    <Badge 
                      variant={hardwareInfo.performance.level === 'high' ? 'success' : 
                              hardwareInfo.performance.level === 'medium' ? 'warning' : 'error'}
                      size="lg"
                    >
                      {hardwareInfo.performance.level.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-aurora-blue mb-1">
                      {hardwareInfo.performance.estimatedGenerationTime}s
                    </div>
                    <h3 className="text-lg font-semibold text-starlight mb-1">
                      Est. Generation Time
                    </h3>
                    <p className="text-sm text-moon-dust">
                      For 24 frames at 512px resolution
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-quantum-green mb-1">
                      {hardwareInfo.gpu.available ? 'GPU' : 'CPU'}
                    </div>
                    <h3 className="text-lg font-semibold text-starlight mb-1">
                      Processing Mode
                    </h3>
                    <p className="text-sm text-moon-dust">
                      {hardwareInfo.gpu.available ? 'Hardware Accelerated' : 'CPU Processing'}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* GPU Information */}
              <motion.div variants={itemVariants}>
                <Card>
                  <div className="flex items-center gap-3 mb-6">
                    <Monitor className="h-6 w-6 text-nebula-purple" />
                    <h2 className="text-xl font-semibold text-starlight">GPU Information</h2>
                  </div>
                  
                  {hardwareInfo.gpu.available ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-moon-dust">Status:</span>
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-moon-dust">Name:</span>
                        <span className="text-starlight font-medium">
                          {hardwareInfo.gpu.name}
                        </span>
                      </div>
                      
                      {hardwareInfo.gpu.memory && (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-moon-dust">Total Memory:</span>
                              <span className="text-starlight">
                                {formatMemory(hardwareInfo.gpu.memory.total)}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-moon-dust">Allocated:</span>
                              <span className="text-starlight">
                                {formatMemory(hardwareInfo.gpu.memory.allocated)}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-moon-dust">Cached:</span>
                              <span className="text-starlight">
                                {formatMemory(hardwareInfo.gpu.memory.cached)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-moon-dust">Memory Usage</span>
                              <span className="text-starlight">
                                {Math.round(((hardwareInfo.gpu.memory.allocated + hardwareInfo.gpu.memory.cached) / hardwareInfo.gpu.memory.total) * 100)}%
                              </span>
                            </div>
                            <ProgressBar
                              value={((hardwareInfo.gpu.memory.allocated + hardwareInfo.gpu.memory.cached) / hardwareInfo.gpu.memory.total) * 100}
                              className="h-2"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <XCircle className="h-12 w-12 text-plasma-red mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-starlight mb-2">
                        No GPU Detected
                      </h3>
                      <p className="text-moon-dust">
                        GPU acceleration is not available. Video generation will use CPU processing.
                      </p>
                    </div>
                  )}
                </Card>
              </motion.div>
              
              {/* CPU Information */}
              <motion.div variants={itemVariants}>
                <Card>
                  <div className="flex items-center gap-3 mb-6">
                    <Cpu className="h-6 w-6 text-quantum-green" />
                    <h2 className="text-xl font-semibold text-starlight">CPU Information</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-moon-dust">Name:</span>
                      <span className="text-starlight font-medium">
                        {hardwareInfo.cpu.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-moon-dust">Cores:</span>
                      <span className="text-starlight">
                        {hardwareInfo.cpu.cores}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-moon-dust">Threads:</span>
                      <span className="text-starlight">
                        {hardwareInfo.cpu.threads}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-moon-dust">Status:</span>
                      <Badge variant="success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
            
            {/* Performance Recommendations */}
            <motion.div variants={itemVariants}>
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="h-6 w-6 text-aurora-blue" />
                  <h2 className="text-xl font-semibold text-starlight">Performance Recommendations</h2>
                </div>
                
                <div className="space-y-4">
                  {hardwareInfo.performance.level === 'high' ? (
                    <div className="p-4 bg-quantum-green/10 border border-quantum-green/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-quantum-green" />
                        <h3 className="font-semibold text-quantum-green">Excellent Performance</h3>
                      </div>
                      <p className="text-sm text-moon-dust">
                        Your system is well-equipped for AI video generation. You can use high-resolution settings and longer videos without performance issues.
                      </p>
                    </div>
                  ) : hardwareInfo.performance.level === 'medium' ? (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        <h3 className="font-semibold text-yellow-400">Good Performance</h3>
                      </div>
                      <p className="text-sm text-moon-dust">
                        Your system can handle video generation well. Consider using medium resolution settings for optimal performance.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-plasma-red/10 border border-plasma-red/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-5 w-5 text-plasma-red" />
                        <h3 className="font-semibold text-plasma-red">Limited Performance</h3>
                      </div>
                      <p className="text-sm text-moon-dust">
                        Your system may struggle with high-resolution video generation. Consider using lower resolution settings or fewer frames for better performance.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 bg-cosmic-gray/50 rounded-lg">
                      <h4 className="font-medium text-starlight mb-2">Recommended Settings</h4>
                      <ul className="text-sm text-moon-dust space-y-1">
                        <li>• Resolution: {hardwareInfo.performance.level === 'high' ? '512-1024px' : '256-512px'}</li>
                        <li>• Frames: {hardwareInfo.performance.level === 'high' ? '24-60' : '12-24'}</li>
                        <li>• FPS: {hardwareInfo.performance.level === 'high' ? '8-15' : '4-8'}</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-cosmic-gray/50 rounded-lg">
                      <h4 className="font-medium text-starlight mb-2">Optimization Tips</h4>
                      <ul className="text-sm text-moon-dust space-y-1">
                        <li>• Close unnecessary applications</li>
                        <li>• Ensure adequate cooling</li>
                        <li>• Use GPU acceleration when available</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Card className="max-w-md mx-auto">
              <XCircle className="h-12 w-12 text-plasma-red mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-starlight mb-2">
                Hardware Detection Failed
              </h3>
              <p className="text-moon-dust mb-4">
                Unable to detect your system's hardware. Please try again.
              </p>
              <Button onClick={detectHardware}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default HardwarePage
