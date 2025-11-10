import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility function to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format file size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format duration in human readable format
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  return `${hours}h ${remainingMinutes}m`
}

// Format date in relative time
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }
  
  return targetDate.toLocaleDateString()
}

// Generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// Validate video generation parameters
export function validateVideoParams(params: {
  prompt: string
  resolution: number
  frames: number
  fps: number
  inferenceSteps: number
  guidanceScale: number
}): string[] {
  const errors: string[] = []
  
  if (!params.prompt || params.prompt.trim().length < 10) {
    errors.push('Prompt must be at least 10 characters long')
  }
  
  if (params.prompt.length > 500) {
    errors.push('Prompt must be less than 500 characters')
  }
  
  if (params.resolution < 128 || params.resolution > 1024) {
    errors.push('Resolution must be between 128 and 1024 pixels')
  }
  
  if (params.resolution % 64 !== 0) {
    errors.push('Resolution must be divisible by 64')
  }
  
  if (params.frames < 1 || params.frames > 100) {
    errors.push('Frame count must be between 1 and 100')
  }
  
  if (params.fps < 1 || params.fps > 60) {
    errors.push('FPS must be between 1 and 60')
  }
  
  if (params.inferenceSteps < 1 || params.inferenceSteps > 100) {
    errors.push('Inference steps must be between 1 and 100')
  }
  
  if (params.guidanceScale < 1.0 || params.guidanceScale > 20.0) {
    errors.push('Guidance scale must be between 1.0 and 20.0')
  }
  
  return errors
}

// Calculate estimated generation time based on hardware
export function estimateGenerationTime(
  frames: number,
  resolution: number,
  performanceLevel: 'high' | 'medium' | 'low'
): number {
  const baseTime = (frames * resolution) / 1000
  
  switch (performanceLevel) {
    case 'high':
      return baseTime * 0.5 // GPU acceleration
    case 'medium':
      return baseTime * 1.0 // CPU processing
    case 'low':
      return baseTime * 2.0 // Slower hardware
    default:
      return baseTime * 1.5
  }
}

// Debounce function for search inputs
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// Download file from URL
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Check if device is mobile
export function isMobile(): boolean {
  return window.innerWidth < 768
}

// Check if device supports touch
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Format number with commas
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + '...'
}

// Get contrast color (black or white) for a given background color
export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const color = hexColor.replace('#', '')
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}
