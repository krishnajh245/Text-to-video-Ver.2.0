import React, { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, 
  Settings, 
  Zap, 
  Clock, 
  Monitor,
  Film,
  Cpu,
  MemoryStick,
  Gauge,
  CheckCircle,
  Sparkles
} from 'lucide-react'
// Button is not used on this page
import EnhancedButton from '@/components/ui/EnhancedButton'
import Input from '@/components/ui/Input'
import EnhancedCard from '@/components/ui/EnhancedCard'
import ProgressBar from '@/components/ui/ProgressBar'
import Badge from '@/components/ui/Badge'
import HuggingFaceIntegration from '@/components/HuggingFaceIntegration'
import AnimatedSection from '@/components/AnimatedSection'
import ParticleBackground from '@/components/ParticleBackground'
import { VideoGenerationRequest, ProgressInfo, HuggingFaceModel } from '@/types'
import { validateVideoParams, estimateGenerationTime } from '@/utils'

const HomePage: React.FC = () => {
  const [formData, setFormData] = useState<VideoGenerationRequest>({
    prompt: '',
    negativePrompt: '',
    resolution: 512,
    frames: 24,
    fps: 8,
    inferenceSteps: 50,
    guidanceScale: 7.5,
    model: 'zeroscope'
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<HuggingFaceModel | null>({
    id: 'zeroscope-local',
    name: 'ZeroScope v2 (Local)',
    description: 'High-quality text-to-video model running locally',
    tags: ['local', 'high-quality', 'fast'],
    downloads: 0,
    likes: 0,
    verified: true
  })
  const [useHuggingFace, setUseHuggingFace] = useState(false)
  const [health, setHealth] = useState<{ status: string; version: string } | null>(null)
  const [hardware, setHardware] = useState<any>(null)
  const [performance, setPerformance] = useState<any>(null)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)

  useEffect(() => {
    // Fetch backend status
    fetch('/health').then(r => r.ok ? r.json() : null).then(setHealth).catch(() => {})
    fetch('/hardware').then(r => r.ok ? r.json() : null).then(setHardware).catch(() => {})
    fetch('/performance').then(r => r.ok ? r.json() : null).then(setPerformance).catch(() => {})
    
    // Cleanup polling on unmount
    return () => {
      isPollingRef.current = false
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }
    }
  }, [])
  
  const handleInputChange = (field: keyof VideoGenerationRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors([])
  }
  
  const handleToggleHuggingFace = (enabled: boolean) => {
    setUseHuggingFace(enabled)
    // Reset model selection when toggling
    if (!enabled) {
      setSelectedModel({
        id: 'zeroscope-local',
        name: 'ZeroScope v2 (Local)',
        description: 'High-quality text-to-video model running locally',
        tags: ['local', 'high-quality', 'fast'],
        downloads: 0,
        likes: 0,
        verified: true
      })
    } else {
      setSelectedModel(null)
    }
  }
  
  const handleGenerate = async () => {
    const validationErrors = validateVideoParams(formData)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    const width = formData.resolution
    const height = formData.resolution

    // Cloud usage is explicitly controlled by the toggle.
    const use_hf_api = useHuggingFace
    const hf_token = use_hf_api ? (localStorage.getItem('hf_token') || '') : ''
    if (use_hf_api && !hf_token) {
      setErrors(["Hugging Face token is required. Add it via the HF toggle panel."])
      return
    }

    // Local model key is used to hint which local preset should be used on the backend.
    const local_model_key =
      selectedModel && (selectedModel.id === 'zeroscope-local' || selectedModel.id === 'modelscope-local')
        ? selectedModel.id
        : undefined

    setIsGenerating(true)
    setProgress({
      current: 0,
      total: 100,
      percentage: 0,
      message: 'Submitting generation request...',
      estimatedTimeRemaining: estimateGenerationTime(formData.frames, formData.resolution, 'medium')
    })

    try {
      const res = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: formData.prompt,
          negative_prompt: formData.negativePrompt || undefined,
          num_frames: formData.frames,
          fps: formData.fps,
          width,
          height,
          num_inference_steps: formData.inferenceSteps,
          guidance_scale: formData.guidanceScale,
          use_hf_api,
          hf_token: use_hf_api ? hf_token : undefined,
          hf_model_repo: use_hf_api ? selectedModel?.id : undefined,
          local_model_key,
        }),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Failed to start generation')
      }
      const start = await res.json()
      const jobId = start.job_id as string
      const videoId = start.video_id as string | undefined

      // Initialize progress
      setProgress({
        percentage: 0,
        message: 'Generation started...',
        stage: 'initializing'
      })
      
      // Clear any existing polling
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }
      isPollingRef.current = true
      
      // Poll status
      const poll = async () => {
        if (!isPollingRef.current) return
        
        try {
          const r = await fetch(`/status/${jobId}`)
          if (!r.ok) throw new Error('Status check failed')
          const s = await r.json()
          
          if (!isPollingRef.current) return
          
          setProgress({
            percentage: s.progress || 0,
            message: s.message || 'Processing...',
            stage: s.status || 'processing'
          })
          
          if (s.status === 'completed') {
            setIsGenerating(false)
            isPollingRef.current = false
            setProgress({
              percentage: 100,
              message: 'Generation completed!',
              stage: 'completed'
            })
            const vid = s.video_id || videoId
            if (vid) {
              window.open(`/videos/${vid}/output.mp4`, '_blank')
            }
            return
          }
          if (s.status === 'failed') {
            setIsGenerating(false)
            isPollingRef.current = false
            setErrors([s.error || 'Generation failed'])
            setProgress(null)
            return
          }
          pollTimeoutRef.current = setTimeout(poll, 1000)
        } catch (e: any) {
          if (isPollingRef.current) {
            setIsGenerating(false)
            isPollingRef.current = false
            setErrors([e?.message || 'Status polling error'])
            setProgress(null)
          }
        }
      }
      
      poll()
    } catch (e: any) {
      setIsGenerating(false)
      setErrors([e?.message || 'Network error'])
    }
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
    <div className="min-h-screen bg-deep-space light:bg-light-bg relative overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground particleCount={30} />
      
      {/* Hero Section */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={itemVariants} className="mb-8">
            <Badge variant="info" className="mb-4">
              <Zap className="h-4 w-4 mr-2" />
              AI-Powered Video Generation
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-starlight mb-6">
              Craft Your Vision with
              <span className="gradient-text-animated block">AI-Powered Magic</span>
            </h1>
            <p className="text-xl text-moon-dust max-w-2xl mx-auto">
              Transform your imagination into stunning videos with VisionCraft AI. The most advanced text-to-video generation platform.
            </p>
          </motion.div>
        </div>
      </motion.section>
      
      {/* Generation Interface */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Generation Form */}
            <AnimatedSection animation="fadeLeft" delay={0.2} className="lg:col-span-2">
              <EnhancedCard className="h-fit" glow="aurora" gradient={true}>
                <div className="flex items-center gap-3 mb-6">
                  <Film className="h-6 w-6 text-aurora-blue" />
                  <h2 className="text-2xl font-semibold text-starlight">Video Generation</h2>
                </div>
                
                {/* Prompt Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-starlight mb-2">
                    Video Description *
                  </label>
                  <textarea
                    value={formData.prompt}
                    onChange={(e) => handleInputChange('prompt', e.target.value)}
                    placeholder="Describe the video you want to create... (e.g., 'A majestic eagle soaring over a mountain range at sunset')"
                    className="input-base min-h-[120px] resize-none"
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-moon-dust">
                      {formData.prompt.length}/500 characters
                    </span>
                    {formData.prompt.length < 10 && (
                      <span className="text-sm text-plasma-red">
                        Minimum 10 characters required
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Negative Prompt */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-starlight mb-2">
                    Negative Prompt (Optional)
                  </label>
                  <Input
                    value={formData.negativePrompt || ''}
                    onChange={(value: string) => handleInputChange('negativePrompt', value)}
                    placeholder="What you don't want in the video..."
                    className="mb-2"
                  />
                </div>
                
                {/* Model Selection */}
                <div className="mb-6">
                  <HuggingFaceIntegration
                    onModelSelect={setSelectedModel}
                    selectedModel={selectedModel}
                    isEnabled={useHuggingFace}
                    onToggle={handleToggleHuggingFace}
                  />
                </div>
                
                {/* Generate Button */}
                <EnhancedButton
                  onClick={handleGenerate}
                  disabled={isGenerating || formData.prompt.length < 10 || !selectedModel}
                  loading={isGenerating}
                  size="lg"
                  className="w-full"
                >
                  <Play className="h-5 w-5 mr-2" />
                  {isGenerating 
                    ? `Generating Video with ${selectedModel?.name}...` 
                    : `Generate Video with ${selectedModel?.name}`
                  }
                </EnhancedButton>
                
                {/* Error Messages */}
                {errors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-plasma-red/10 border border-plasma-red/20 rounded-lg"
                  >
                    <ul className="text-sm text-plasma-red space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </EnhancedCard>
            </AnimatedSection>
            
            {/* Parameters Panel */}
            <AnimatedSection animation="fadeRight" delay={0.4} className="space-y-6">
              <EnhancedCard glow="nebula">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="h-5 w-5 text-nebula-purple" />
                  <h3 className="text-lg font-semibold text-starlight">Parameters</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Resolution */}
                  <div>
                    <label className="block text-sm font-medium text-starlight mb-2">
                      Resolution: {formData.resolution}px
                    </label>
                    <input
                      type="range"
                      min="128"
                      max="1024"
                      step="64"
                      value={formData.resolution}
                      onChange={(e) => handleInputChange('resolution', parseInt(e.target.value))}
                      className="w-full h-2 bg-cosmic-gray rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-moon-dust mt-1">
                      <span>128px</span>
                      <span>1024px</span>
                    </div>
                  </div>
                  
                  {/* Frames */}
                  <div>
                    <label className="block text-sm font-medium text-starlight mb-2">
                      Frames: {formData.frames}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={formData.frames}
                      onChange={(e) => handleInputChange('frames', parseInt(e.target.value))}
                      className="w-full h-2 bg-cosmic-gray rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-moon-dust mt-1">
                      <span>1</span>
                      <span>100</span>
                    </div>
                  </div>
                  
                  {/* FPS */}
                  <div>
                    <label className="block text-sm font-medium text-starlight mb-2">
                      FPS: {formData.fps}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={formData.fps}
                      onChange={(e) => handleInputChange('fps', parseInt(e.target.value))}
                      className="w-full h-2 bg-cosmic-gray rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-moon-dust mt-1">
                      <span>1</span>
                      <span>60</span>
                    </div>
                  </div>
                  
                  {/* Inference Steps */}
                  <div>
                    <label className="block text-sm font-medium text-starlight mb-2">
                      Inference Steps: {formData.inferenceSteps}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={formData.inferenceSteps}
                      onChange={(e) => handleInputChange('inferenceSteps', parseInt(e.target.value))}
                      className="w-full h-2 bg-cosmic-gray rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-moon-dust mt-1">
                      <span>1</span>
                      <span>100</span>
                    </div>
                  </div>
                  
                  {/* Guidance Scale */}
                  <div>
                    <label className="block text-sm font-medium text-starlight mb-2">
                      Guidance Scale: {formData.guidanceScale}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={formData.guidanceScale}
                      onChange={(e) => handleInputChange('guidanceScale', parseFloat(e.target.value))}
                      className="w-full h-2 bg-cosmic-gray rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-moon-dust mt-1">
                      <span>1.0</span>
                      <span>20.0</span>
                    </div>
                  </div>
                </div>
              </EnhancedCard>
              
              {/* Progress Card */}
              {progress && (
                <EnhancedCard glow="aurora">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="h-5 w-5 text-aurora-blue" />
                    <h3 className="text-lg font-semibold text-starlight">Generation Progress</h3>
                  </div>
                  
                  <ProgressBar
                    value={progress.percentage}
                    className="mb-4"
                  />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-moon-dust">Status:</span>
                      <span className="text-starlight">{progress.message}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-moon-dust">Estimated Time:</span>
                      <span className="text-starlight">{progress.estimatedTimeRemaining}s</span>
                    </div>
                  </div>
                </EnhancedCard>
              )}
              
              {/* Enhanced System Status */}
              <EnhancedCard glow="quantum" gradient={true}>
                <div className="flex items-center gap-3 mb-4">
                  <Gauge className="h-5 w-5 text-quantum-green" />
                  <h3 className="text-lg font-semibold text-starlight">System Status</h3>
                </div>
                
                <div className="space-y-4">
                  {/* GPU Status */}
                  <div className="p-3 bg-cosmic-gray/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="h-4 w-4 text-aurora-blue" />
                      <span className="text-sm font-medium text-starlight">GPU Acceleration</span>
                      <Badge variant={hardware?.gpu?.cuda_available ? 'success' : 'info'} size="sm">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {hardware?.gpu?.cuda_available ? 'Active' : 'Unavailable'}
                      </Badge>
                    </div>
                    <div className="text-xs text-moon-dust">
                      {hardware?.gpu?.gpus?.length > 0
                        ? `${hardware.gpu.gpus[0].name} • VRAM: ${Math.round((hardware.gpu.gpus[0].memory?.total || 0)/1024/1024/1024)}GB`
                        : 'No GPU detected'}
                    </div>
                  </div>

                  {/* CPU Status */}
                  <div className="p-3 bg-cosmic-gray/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className="h-4 w-4 text-nebula-purple" />
                      <span className="text-sm font-medium text-starlight">CPU Processing</span>
                      <Badge variant="info" size="sm">{hardware?.gpu?.cuda_available ? 'Standby' : 'Active'}</Badge>
                    </div>
                    <div className="text-xs text-moon-dust">
                      {hardware?.cpu ? `${hardware.cpu.cores} Cores • ${hardware.cpu.threads || hardware.cpu.cores} Threads` : 'Detecting...' }
                    </div>
                  </div>

                  {/* Memory Status */}
                  <div className="p-3 bg-cosmic-gray/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MemoryStick className="h-4 w-4 text-quantum-green" />
                      <span className="text-sm font-medium text-starlight">Memory Usage</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-moon-dust">GPU Memory</span>
                        <span className="text-starlight">8.2GB / 16GB</span>
                      </div>
                      <ProgressBar
                        value={51.25}
                        className="h-1"
                        showPercentage={false}
                      />
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-cosmic-gray/30 rounded">
                      <div className="text-lg font-bold text-aurora-blue">
                        {performance?.estimated_time || `${Math.round(estimateGenerationTime(formData.frames, formData.resolution, 'high'))}s`}
                      </div>
                      <div className="text-xs text-moon-dust">Est. Time</div>
                    </div>
                    <div className="text-center p-2 bg-cosmic-gray/30 rounded">
                      <div className="text-lg font-bold text-quantum-green">{performance?.performance_level ? performance.performance_level.toUpperCase() : 'HIGH'}</div>
                      <div className="text-xs text-moon-dust">Performance</div>
                    </div>
                  </div>

                  {/* Model Type Indicator */}
                  <div className="p-3 bg-cosmic-gray/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-aurora-blue" />
                      <span className="text-sm font-medium text-starlight">Active Model</span>
                    </div>
                    <div className="text-sm text-moon-dust">
                      {selectedModel?.name || 'No model selected'}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant={useHuggingFace ? 'info' : 'success'} 
                        size="sm"
                      >
                        {useHuggingFace ? 'Hugging Face' : 'Local'}
                      </Badge>
                      {selectedModel?.tags.includes('local') && (
                        <Badge variant="success" size="sm">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 p-2 bg-quantum-green/10 border border-quantum-green/20 rounded">
                    <div className="w-2 h-2 bg-quantum-green rounded-full animate-pulse"></div>
                    <span className="text-sm text-quantum-green font-medium">System Ready</span>
                  </div>
                </div>
              </EnhancedCard>
            </AnimatedSection>
          </div>
        </div>
      </motion.section>
    </div>
  )
}

export default HomePage
