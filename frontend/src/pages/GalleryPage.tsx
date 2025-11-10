import React, { useState, useMemo } from 'react'
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

// Mock data for demonstration
const mockVideos: VideoMetadata[] = [
  {
    id: '1',
    prompt: 'A majestic eagle soaring over a mountain range at sunset',
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
  },
  {
    id: '2',
    prompt: 'A futuristic city with flying cars and neon lights',
    model: 'modelscope',
    resolution: 768,
    frames: 48,
    fps: 12,
    inferenceSteps: 30,
    guidanceScale: 8.0,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    duration: 4,
    fileSize: 4097152,
    videoUrl: '/api/videos/2.mp4',
    thumbnailUrl: '/api/thumbnails/2.jpg'
  },
  {
    id: '3',
    prompt: 'Ocean waves crashing against rocky cliffs in slow motion',
    model: 'zeroscope',
    resolution: 1024,
    frames: 60,
    fps: 15,
    inferenceSteps: 75,
    guidanceScale: 6.5,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    duration: 4,
    fileSize: 8194304,
    videoUrl: '/api/videos/3.mp4',
    thumbnailUrl: '/api/thumbnails/3.jpg'
  }
]

const GalleryPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    model: '',
    sortBy: 'newest',
    sortOrder: 'desc'
  })
  // selectedVideo state removed (unused)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null)
  
  const filteredVideos = useMemo(() => {
    const filtered = mockVideos.filter(video => {
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
  }, [filters])
  
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
  
  const confirmDelete = () => {
    if (videoToDelete) {
      // In real implementation, this would call the API to delete the video
      console.log('Deleting video:', videoToDelete)
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
          {filteredVideos.length === 0 ? (
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
                        <div className="w-full h-full bg-gradient-to-br from-aurora-blue/20 to-nebula-purple/20 flex items-center justify-center">
                          <Play className="h-12 w-12 text-aurora-blue opacity-50" />
                        </div>
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
                          <div className="w-full h-full bg-gradient-to-br from-aurora-blue/20 to-nebula-purple/20 flex items-center justify-center">
                            <Play className="h-8 w-8 text-aurora-blue opacity-50" />
                          </div>
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
