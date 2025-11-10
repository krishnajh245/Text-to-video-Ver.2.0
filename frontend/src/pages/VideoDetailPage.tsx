import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Trash2, 
  Play, 
  Pause,
  Film,
  Monitor,
  Settings,
  Copy,
  Check
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { VideoMetadata } from '@/types'
import { formatRelativeTime, formatFileSize, formatDuration, copyToClipboard } from '@/utils'

// Mock data - in real app this would come from API
const mockVideo: VideoMetadata = {
  id: '1',
  prompt: 'A majestic eagle soaring over a mountain range at sunset',
  negativePrompt: 'blurry, low quality, distorted',
  model: 'zeroscope',
  resolution: 512,
  frames: 24,
  fps: 8,
  inferenceSteps: 50,
  guidanceScale: 7.5,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  duration: 3,
  fileSize: 2048576,
  videoUrl: '/api/videos/1.mp4',
  thumbnailUrl: '/api/thumbnails/1.jpg'
}

const VideoDetailPage: React.FC = () => {
  useParams<{ id: string }>()
  const [isPlaying, setIsPlaying] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  
  // In real app, fetch video by ID
  const video = mockVideo
  
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }
  
  const handleDownload = () => {
    // In real app, this would trigger download
    console.log('Downloading video:', video.id)
  }
  
  const handleShare = () => {
    const url = `${window.location.origin}/video/${video.id}`
    setShareUrl(url)
    copyToClipboard(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  
  const handleDelete = () => {
    setShowDeleteModal(true)
  }
  
  const confirmDelete = () => {
    // In real app, this would call API to delete video
    console.log('Deleting video:', video.id)
    setShowDeleteModal(false)
    // Redirect to gallery
    window.location.href = '/gallery'
  }
  
  if (!video) {
    return (
      <div className="min-h-screen bg-deep-space flex items-center justify-center">
        <Card className="text-center py-12">
          <h2 className="text-2xl font-semibold text-starlight mb-4">
            Video Not Found
          </h2>
          <p className="text-moon-dust mb-6">
            The video you're looking for doesn't exist or has been deleted.
          </p>
          <Link to="/gallery">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gallery
            </Button>
          </Link>
        </Card>
      </div>
    )
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
          <div className="flex items-center gap-4 mb-6">
            <Link to="/gallery">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gallery
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-starlight line-clamp-2">
                {video.prompt}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-moon-dust">
                <span>{formatRelativeTime(video.createdAt)}</span>
                <Badge variant="info" size="sm">
                  {video.model}
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="overflow-hidden">
              <div className="aspect-video bg-cosmic-gray relative group">
                {/* Video Placeholder */}
                <div className="w-full h-full bg-gradient-to-br from-aurora-blue/20 to-nebula-purple/20 flex items-center justify-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePlayPause}
                    className="p-4 rounded-full bg-aurora-blue/20 backdrop-blur-sm border border-aurora-blue/30 hover:bg-aurora-blue/30 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="h-12 w-12 text-aurora-blue" />
                    ) : (
                      <Play className="h-12 w-12 text-aurora-blue ml-1" />
                    )}
                  </motion.button>
                </div>
                
                {/* Video Controls Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePlayPause}
                      className="bg-deep-space/80 backdrop-blur-sm"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <span className="text-sm text-starlight bg-deep-space/80 backdrop-blur-sm px-2 py-1 rounded">
                      {formatDuration(video.duration)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownload}
                      className="bg-deep-space/80 backdrop-blur-sm"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShare}
                      className="bg-deep-space/80 backdrop-blur-sm"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Video Actions */}
            <div className="flex gap-4 mt-6">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Video
              </Button>
              <Button variant="secondary" onClick={handleShare} className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Share Video
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </motion.div>
          
          {/* Video Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Basic Info */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Film className="h-5 w-5 text-aurora-blue" />
                <h3 className="text-lg font-semibold text-starlight">Video Details</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-moon-dust">Duration:</span>
                  <span className="text-starlight">{formatDuration(video.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-moon-dust">File Size:</span>
                  <span className="text-starlight">{formatFileSize(video.fileSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-moon-dust">Created:</span>
                  <span className="text-starlight">{formatRelativeTime(video.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-moon-dust">Model:</span>
                  <Badge variant="info" size="sm">
                    {video.model}
                  </Badge>
                </div>
              </div>
            </Card>
            
            {/* Generation Parameters */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Settings className="h-5 w-5 text-nebula-purple" />
                <h3 className="text-lg font-semibold text-starlight">Generation Parameters</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-moon-dust">Resolution:</span>
                  <span className="text-starlight">{video.resolution}px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-moon-dust">Frames:</span>
                  <span className="text-starlight">{video.frames}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-moon-dust">FPS:</span>
                  <span className="text-starlight">{video.fps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-moon-dust">Inference Steps:</span>
                  <span className="text-starlight">{video.inferenceSteps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-moon-dust">Guidance Scale:</span>
                  <span className="text-starlight">{video.guidanceScale}</span>
                </div>
              </div>
            </Card>
            
            {/* Prompt Details */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Monitor className="h-5 w-5 text-quantum-green" />
                <h3 className="text-lg font-semibold text-starlight">Prompt</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-moon-dust mb-2">
                    Description
                  </label>
                  <p className="text-sm text-starlight bg-cosmic-gray/50 p-3 rounded-lg">
                    {video.prompt}
                  </p>
                </div>
                
                {video.negativePrompt && (
                  <div>
                    <label className="block text-sm font-medium text-moon-dust mb-2">
                      Negative Prompt
                    </label>
                    <p className="text-sm text-starlight bg-cosmic-gray/50 p-3 rounded-lg">
                      {video.negativePrompt}
                    </p>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Share URL */}
            {shareUrl && (
              <Card glow="aurora">
                <div className="flex items-center gap-3 mb-4">
                  <Share2 className="h-5 w-5 text-aurora-blue" />
                  <h3 className="text-lg font-semibold text-starlight">Share Link</h3>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    onChange={() => { /* read-only */ }}
                    className="flex-1 text-sm"
                  />
                  <Button
                    variant={copied ? 'secondary' : 'secondary'}
                    size="sm"
                    onClick={() => {
                      copyToClipboard(shareUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {copied && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-quantum-green mt-2"
                  >
                    Link copied to clipboard!
                  </motion.p>
                )}
              </Card>
            )}
          </motion.div>
        </div>
        
        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Video"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-moon-dust">
              Are you sure you want to delete this video? This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default VideoDetailPage
