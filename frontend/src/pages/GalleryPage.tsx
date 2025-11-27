import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Grid3X3, 
  List, 
  Trash2,
  Play,
  Calendar,
  Film
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { VideoMetadata, SearchFilters } from '@/types'
import { formatRelativeTime, formatFileSize, formatDuration } from '@/utils'

const GalleryPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    model: '',
    sortBy: 'newest',
    sortOrder: 'desc'
  })
  const [videos, setVideos] = useState<VideoMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setError(null)
        setLoading(true)
        const res = await fetch('/videos')
        if (!res.ok) {
          throw new Error('Failed to load videos')
        }
        const data = await res.json()
        const mapped: VideoMetadata[] = (Array.isArray(data) ? data : []).map((item: any) => {
          const params = item?.params || {}
          const frames = Number(item?.frame_count || params.num_frames || 0)
          const fps = Number(params.fps || 8)
          const width = Number(params.width || params.resolution || 512)
          const height = Number(params.height || params.resolution || 512)
          const resolution = Math.max(width, height) || 512
          const duration = fps > 0 && frames > 0 ? frames / fps : 0
          const modelKey = params.local_model_key as string | undefined
          const model = modelKey === 'modelscope-local' ? 'modelscope' : 'zeroscope'
          return {
            id: String(item.id),
            prompt: params.prompt || 'Generated video',
            negativePrompt: params.negative_prompt,
            model,
            resolution,
            frames,
            fps,
            inferenceSteps: Number(params.num_inference_steps || 0),
            guidanceScale: Number(params.guidance_scale || 0),
            createdAt: String(item.created_at || new Date().toISOString()),
            duration,
            fileSize: 0,
            thumbnailUrl: `/videos/${item.id}/thumbnail.jpg`,
            videoUrl: `/videos/${item.id}/output.mp4`
          }
        })
        setVideos(mapped)
      } catch (e: any) {
        setError(e?.message || 'Failed to load videos')
      } finally {
        setLoading(false)
      }
    }

    fetchVideos().catch(() => {
      setError('Failed to load videos')
      setLoading(false)
    })
  }, [])

  const filteredVideos = useMemo(() => {
    const filtered = videos.filter(video => {
      const matchesQuery = !filters.query || 
        video.prompt.toLowerCase().includes(filters.query.toLowerCase())
      const matchesModel = !filters.model || video.model === filters.model
      
      return matchesQuery && matchesModel
    })
    
    // Sort videos
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (filters.sortBy) {
        case 'newest':
        case 'oldest':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'frames':
          comparison = a.frames - b.frames
          break
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison
    })
    
    return filtered
  }, [filters, videos])
  
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }))
  }
  
  const handleModelFilter = (model: string) => {
    setFilters(prev => ({ ...prev, model: model === 'all' ? '' : model }))
  }
  
  const handleSort = (sortBy: SearchFilters['sortBy']) => {
    setFilters(prev => ({ 
      ...prev, 
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }))
  }
  
  const handleDelete = (videoId: string) => {
    setVideoToDelete(videoId)
    setShowDeleteModal(true)
  }
  
  const confirmDelete = async () => {
    if (!videoToDelete) return
    try {
      const res = await fetch(`/videos/${videoToDelete}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('Failed to delete video')
      }
      setVideos(prev => prev.filter(v => v.id !== videoToDelete))
    } catch (e) {
      console.error(e)
    } finally {
      setShowDeleteModal(false)
      setVideoToDelete(null)
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
    <div className="min-h-screen bg-deep-space py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Grid3X3 className="h-8 w-8 text-aurora-blue" />
            <h1 className="text-3xl font-bold text-starlight">Video Gallery</h1>
            <Badge variant="info">{filteredVideos.length} videos</Badge>
          </div>
          <p className="text-moon-dust">
            Browse and manage your AI-generated video collection
          </p>
        </motion.div>
        
        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-moon-dust" />
                  <Input
                    value={filters.query}
                    onChange={handleSearch}
                    placeholder="Search videos by prompt..."
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Model Filter */}
              <div className="flex gap-2">
                <Button
                  variant={filters.model === '' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleModelFilter('all')}
                >
                  All Models
                </Button>
                <Button
                  variant={filters.model === 'zeroscope' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleModelFilter('zeroscope')}
                >
                  ZeroScope
                </Button>
                <Button
                  variant={filters.model === 'modelscope' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleModelFilter('modelscope')}
                >
                  ModelScope
                </Button>
              </div>
              
              {/* Sort Options */}
              <div className="flex gap-2">
                <Button
                  variant={filters.sortBy === 'newest' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleSort('newest')}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Date
                </Button>
                <Button
                  variant={filters.sortBy === 'frames' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleSort('frames')}
                >
                  <Film className="h-4 w-4 mr-1" />
                  Frames
                </Button>
              </div>
              
              {/* View Mode */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* Video Grid/List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {loading ? (
            <Card className="text-center py-12">
              <Film className="h-16 w-16 text-moon-dust mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-starlight mb-2">
                Loading videos...
              </h3>
            </Card>
          ) : error ? (
            <Card className="text-center py-12">
              <h3 className="text-xl font-semibold text-starlight mb-2">
                Failed to load videos
              </h3>
              <p className="text-moon-dust mb-6">{error}</p>
            </Card>
          ) : filteredVideos.length === 0 ? (
            <Card className="text-center py-12">
              <Film className="h-16 w-16 text-moon-dust mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-starlight mb-2">
                No videos found
              </h3>
              <p className="text-moon-dust mb-6">
                {filters.query || filters.model 
                  ? 'Try adjusting your search or filters'
                  : 'Start by generating your first video'
                }
              </p>
              {!filters.query && !filters.model && (
                <Link to="/">
                  <Button>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Video
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }>
              {filteredVideos.map((video) => (
                <motion.div key={video.id} variants={itemVariants}>
                  {viewMode === 'grid' ? (
                    <Card className="group cursor-pointer" glow="nebula">
                      <div className="aspect-video bg-cosmic-gray rounded-lg mb-4 overflow-hidden">
                        <video
                          src={video.videoUrl}
                          poster={video.thumbnailUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="font-medium text-starlight line-clamp-2 group-hover:text-aurora-blue transition-colors">
                          {video.prompt}
                        </h3>
                        
                        <div className="flex items-center justify-between text-sm text-moon-dust">
                          <Badge variant="info" size="sm">
                            {video.model}
                          </Badge>
                          <span>{formatRelativeTime(video.createdAt)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-moon-dust">
                          <span>{video.frames} frames</span>
                          <span>{formatDuration(video.duration)}</span>
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Link to={`/video/${video.id}`} className="flex-1">
                            <Button variant="secondary" size="sm" className="w-full">
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(video.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="group">
                      <div className="flex gap-4">
                        <div className="w-32 h-20 bg-cosmic-gray rounded-lg overflow-hidden flex-shrink-0">
                          <video
                            src={video.videoUrl}
                            poster={video.thumbnailUrl}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-starlight line-clamp-1 group-hover:text-aurora-blue transition-colors">
                              {video.prompt}
                            </h3>
                            <div className="flex gap-2 ml-4">
                              <Link to={`/video/${video.id}`}>
                                <Button variant="secondary" size="sm">
                                  View
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(video.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-moon-dust">
                            <Badge variant="info" size="sm">
                              {video.model}
                            </Badge>
                            <span>{video.frames} frames</span>
                            <span>{formatDuration(video.duration)}</span>
                            <span>{formatFileSize(video.fileSize)}</span>
                            <span>{formatRelativeTime(video.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
        
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

export default GalleryPage
