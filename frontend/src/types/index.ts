// Video generation types
export interface VideoGenerationRequest {
  prompt: string
  negativePrompt?: string
  resolution: number
  frames: number
  fps: number
  inferenceSteps: number
  guidanceScale: number
  model: 'zeroscope' | 'modelscope'
}

export interface VideoGenerationResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  estimatedTime?: number
  videoUrl?: string
  error?: string
}

// Video metadata types
export interface VideoMetadata {
  id: string
  prompt: string
  negativePrompt?: string
  model: string
  resolution: number
  frames: number
  fps: number
  inferenceSteps: number
  guidanceScale: number
  createdAt: string
  duration: number
  fileSize: number
  thumbnailUrl?: string
  videoUrl: string
}

// Hardware detection types
export interface HardwareInfo {
  gpu: {
    available: boolean
    name?: string
    memory?: {
      total: number
      allocated: number
      cached: number
    }
  }
  cpu: {
    cores: number
    threads: number
    name: string
  }
  performance: {
    level: 'high' | 'medium' | 'low'
    estimatedGenerationTime: number
  }
}

// UI component types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number'
  placeholder?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  className?: string
}

export interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: 'aurora' | 'nebula' | 'quantum' | 'plasma'
}

// Navigation types
export interface NavItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  active?: boolean
}

// Search and filter types
export interface SearchFilters {
  query: string
  model?: string
  sortBy: 'newest' | 'oldest' | 'frames'
  sortOrder: 'asc' | 'desc'
}

// Progress tracking types
export interface ProgressInfo {
  current: number
  total: number
  percentage: number
  message: string
  estimatedTimeRemaining?: number
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: string
  timestamp: string
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: AppError
}

// Form validation types
export interface ValidationError {
  field: string
  message: string
}

export interface FormState<T> {
  values: T
  errors: ValidationError[]
  isSubmitting: boolean
  isValid: boolean
}

// Hugging Face integration types
export interface HuggingFaceModel {
  id: string
  name: string
  description: string
  tags: string[]
  downloads: number
  likes: number
  verified: boolean
}
