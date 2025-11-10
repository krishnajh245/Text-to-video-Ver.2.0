import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Key, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff,
  ExternalLink,
  Sparkles
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

interface HuggingFaceModel {
  id: string
  name: string
  description: string
  tags: string[]
  downloads: number
  likes: number
  verified: boolean
}

interface HuggingFaceIntegrationProps {
  onModelSelect: (model: HuggingFaceModel | null) => void
  selectedModel?: HuggingFaceModel | null
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
}

const HuggingFaceIntegration: React.FC<HuggingFaceIntegrationProps> = ({
  onModelSelect,
  selectedModel,
  isEnabled,
  onToggle
}) => {
  const [apiKey, setApiKey] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showModels, setShowModels] = useState(false)
  const [availableModels, setAvailableModels] = useState<HuggingFaceModel[]>([])
  const [error, setError] = useState('')
  const [localCheck, setLocalCheck] = useState<Record<string, { downloaded: boolean; size_bytes: number }>>({})
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({})

  const LOCAL_MAP: Record<string, string> = {
    'zeroscope-local': 'cerspense/zeroscope_v2_576w',
    'modelscope-local': 'ali-vilab/modelscope-damo-text-to-video-synthesis',
  }

  const refreshLocalStatus = async () => {
    const entries = Object.entries(LOCAL_MAP)
    const next: Record<string, { downloaded: boolean; size_bytes: number }> = {}
    await Promise.all(entries.map(async ([key, repo]) => {
      try {
        const q = new URLSearchParams({ repo_id: repo }).toString()
        const res = await fetch(`/models/local/status?${q}`)
        if (!res.ok) throw new Error()
        const info = await res.json()
        next[key] = { downloaded: Boolean(info?.downloaded), size_bytes: Number(info?.size_bytes || 0) }
      } catch {
        next[key] = { downloaded: false, size_bytes: 0 }
      }
    }))
    setLocalCheck(next)
  }

  const handleLocalDownload = async (key: 'zeroscope-local' | 'modelscope-local') => {
    const repo = LOCAL_MAP[key]
    setIsDownloading(prev => ({ ...prev, [key]: true }))
    try {
      // Immediate UI feedback for long-running download
      setError('')
      const res = await fetch('/models/local/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: repo })
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Download failed')
      }
      // After server completes, refresh status
      await refreshLocalStatus()
    } catch (e: any) {
      setError(e?.message || 'Download failed')
    } finally {
      setIsDownloading(prev => ({ ...prev, [key]: false }))
    }
  }

  React.useEffect(() => {
    refreshLocalStatus().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchModels = async (_token: string) => {
    try {
      const DEFAULT_IDS: string[] = [
        'damo-vilab/text-to-video-ms-1.7b',
        'tencent/HunyuanVideo',
        'hpcai-tech/Open-Sora-v2',
        'genmo/mochi-1-preview',
        'ali-vilab/modelscope-damo-text-to-video-synthesis',
        'ali-vilab/i2vgen-xl',
      ]
      const sup = await fetch('/models/supported').then(r => r.ok ? r.json() : ({ models: [] })).catch(() => ({ models: [] }))
      const tre = await fetch('/models/trending').then(r => r.ok ? r.json() : ({ models: [] })).catch(() => ({ models: [] }))
      const ids: string[] = Array.isArray(sup?.models) ? sup.models : []
      const trending = Array.isArray(tre?.models) ? tre.models : []
      const trendingMap: Record<string, { id?: string; tags?: string[]; downloads?: number; likes?: number }> = {}
      trending.forEach((m: { id?: string; tags?: string[]; downloads?: number; likes?: number }) => { if (m?.id) trendingMap[m.id] = m })
      const sourceIds = (ids && ids.length > 0) ? ids : DEFAULT_IDS
      const merged: HuggingFaceModel[] = sourceIds.map((id: string) => {
        const meta = trendingMap[id] || {}
        return {
          id,
          name: id,
          description: 'Text-to-Video model on Hugging Face',
          tags: Array.isArray(meta.tags) ? meta.tags : ['text-to-video'],
          downloads: Number(meta.downloads || 0),
          likes: Number(meta.likes || 0),
          verified: Boolean(meta?.id),
        }
      })
      setAvailableModels(merged)
      setShowModels(true)
    } catch (e) {
      // Fall back to defaults if something unexpected happens
      const fallback: HuggingFaceModel[] = [
        {
          id: 'damo-vilab/text-to-video-ms-1.7b',
          name: 'damo-vilab/text-to-video-ms-1.7b',
          description: 'Text-to-Video model on Hugging Face',
          tags: ['text-to-video'],
          downloads: 0,
          likes: 0,
          verified: false,
        },
      ]
      setAvailableModels(fallback)
      setShowModels(true)
      setError('Failed to load models list. Showing defaults.')
    }
  }

  const verifyApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Hugging Face API key')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const res = await fetch('/hf-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hf_token: apiKey }),
      })
      const data = await res.json()
      if (res.ok && data?.valid) {
        setIsVerified(true)
        localStorage.setItem('hf_token', apiKey)
        await fetchModels(apiKey)
      } else {
        setError(data?.message || 'Invalid token')
      }
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleModelSelect = (model: HuggingFaceModel) => {
    onModelSelect(model)
    setShowModels(false)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  return (
    <div className="space-y-4">
      {/* Model Selection Toggle */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-aurora-blue" />
            <h3 className="text-lg font-semibold text-starlight">AI Model Selection</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-moon-dust">Use Hugging Face Models</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => onToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-cosmic-gray peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-aurora-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-moon-dust after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-aurora-blue"></div>
            </label>
          </div>
        </div>

        {!isEnabled ? (
          <div className="space-y-4">
            <div className="p-4 bg-cosmic-gray/50 rounded-lg">
              <h4 className="font-medium text-starlight mb-2">Local Models</h4>
              <p className="text-sm text-moon-dust mb-4">
                Using locally installed models for faster generation and privacy. You may need to download model files first.
                Downloads can be large and take several minutes. Keep this tab open.
              </p>
              {(isDownloading['zeroscope-local'] || isDownloading['modelscope-local']) && (
                <div className="mb-3 p-2 rounded bg-aurora-blue/10 border border-aurora-blue/20 text-aurora-blue text-xs">
                  Download in progress… this can take several minutes depending on your connection.
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onModelSelect({
                    id: 'zeroscope-local',
                    name: 'ZeroScope v2 (Local)',
                    description: 'High-quality text-to-video model running locally',
                    tags: ['local', 'high-quality', 'fast'],
                    downloads: 0,
                    likes: 0,
                    verified: true
                  })}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedModel?.id === 'zeroscope-local'
                      ? 'border-aurora-blue bg-aurora-blue/10 text-aurora-blue'
                      : 'border-moon-dust/20 bg-cosmic-gray text-moon-dust hover:border-aurora-blue/50'
                  }`}
                  disabled={Boolean(isDownloading['modelscope-local'])}
                >
                  <div className="font-medium text-sm">ZeroScope v2</div>
                  <div className="text-xs opacity-75">Local • High Quality</div>
                  <div className="text-[11px] mt-1">
                    {localCheck['zeroscope-local']?.downloaded
                      ? <span className="text-quantum-green">Downloaded ({Math.round((localCheck['zeroscope-local']?.size_bytes||0)/1024/1024)} MB)</span>
                      : <span className="text-plasma-red">Not downloaded</span>
                    }
                  </div>
                  {!localCheck['zeroscope-local']?.downloaded && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleLocalDownload('zeroscope-local') }}
                      className="mt-2 text-xs px-2 py-1 rounded bg-aurora-blue text-deep-space disabled:opacity-60"
                      disabled={isDownloading['zeroscope-local'] || isDownloading['modelscope-local']}
                    >
                      {isDownloading['zeroscope-local'] ? 'Downloading…' : 'Download'}
                    </button>
                  )}
                </button>
                
                <button
                  onClick={() => onModelSelect({
                    id: 'modelscope-local',
                    name: 'ModelScope T2V (Local)',
                    description: 'Fast text-to-video generation running locally',
                    tags: ['local', 'fast', 'efficient'],
                    downloads: 0,
                    likes: 0,
                    verified: true
                  })}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedModel?.id === 'modelscope-local'
                      ? 'border-aurora-blue bg-aurora-blue/10 text-aurora-blue'
                      : 'border-moon-dust/20 bg-cosmic-gray text-moon-dust hover:border-aurora-blue/50'
                  }`}
                  disabled={Boolean(isDownloading['zeroscope-local'])}
                >
                  <div className="font-medium text-sm">ModelScope T2V</div>
                  <div className="text-xs opacity-75">Local • Fast</div>
                  <div className="text-[11px] mt-1">
                    {localCheck['modelscope-local']?.downloaded
                      ? <span className="text-quantum-green">Downloaded ({Math.round((localCheck['modelscope-local']?.size_bytes||0)/1024/1024)} MB)</span>
                      : <span className="text-plasma-red">Not downloaded</span>
                    }
                  </div>
                  {!localCheck['modelscope-local']?.downloaded && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleLocalDownload('modelscope-local') }}
                      className="mt-2 text-xs px-2 py-1 rounded bg-aurora-blue text-deep-space disabled:opacity-60"
                      disabled={isDownloading['modelscope-local'] || isDownloading['zeroscope-local']}
                    >
                      {isDownloading['modelscope-local'] ? 'Downloading…' : 'Download'}
                    </button>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Key className="h-5 w-5 text-aurora-blue" />
              <h4 className="text-md font-semibold text-starlight">Hugging Face Integration</h4>
              {isVerified && (
                <Badge variant="success" size="sm">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>

            {!isVerified ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-starlight mb-2">
                    Hugging Face API Key
                  </label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={setApiKey}
                      placeholder="Enter your Hugging Face API key..."
                      className="pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-moon-dust hover:text-starlight transition-colors"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-moon-dust mt-1">
                    Get your API key from{' '}
                    <a
                      href="https://huggingface.co/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-aurora-blue hover:underline inline-flex items-center gap-1"
                    >
                      Hugging Face Settings
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-plasma-red/10 border border-plasma-red/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-plasma-red" />
                      <span className="text-sm text-plasma-red">{error}</span>
                    </div>
                  </motion.div>
                )}

                <Button
                  onClick={verifyApiKey}
                  disabled={isVerifying || !apiKey.trim()}
                  loading={isVerifying}
                  className="w-full"
                >
                  {isVerifying ? 'Verifying...' : 'Verify & Connect'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-moon-dust">API Key: {apiKey.slice(0, 8)}...{apiKey.slice(-4)}</p>
                    <p className="text-xs text-quantum-green">✓ Verified and connected</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsVerified(false)
                      setApiKey('')
                      setShowModels(false)
                      setAvailableModels([])
                    }}
                  >
                    Disconnect
                  </Button>
                </div>

                <Button
                  onClick={() => setShowModels(true)}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Browse Available Models
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Selected Model Display */}
      {selectedModel && (
        <Card glow="aurora">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-5 w-5 text-aurora-blue" />
            <h3 className="text-lg font-semibold text-starlight">Selected Model</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-starlight">{selectedModel.name}</h4>
              <p className="text-sm text-moon-dust">{selectedModel.description}</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {selectedModel.tags.map((tag) => (
                <Badge key={tag} variant="info" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-moon-dust">
              <span>{formatNumber(selectedModel.downloads)} downloads</span>
              <span>{formatNumber(selectedModel.likes)} likes</span>
              {selectedModel.verified && (
                <Badge variant="success" size="sm">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Models Modal */}
      <Modal
        isOpen={showModels}
        onClose={() => setShowModels(false)}
        title="Available Video Generation Models"
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
          {availableModels.map((model) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className="p-4 border border-nebula-purple/20 rounded-lg hover:border-aurora-blue/50 transition-colors cursor-pointer"
              onClick={() => handleModelSelect(model)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-starlight">{model.name}</h4>
                    {model.verified && (
                      <CheckCircle className="h-4 w-4 text-quantum-green" />
                    )}
                  </div>
                  <p className="text-sm text-moon-dust mb-2">{model.description}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {model.tags.map((tag) => (
                      <Badge key={tag} variant="info" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-moon-dust">
                    <span>{formatNumber(model.downloads)} downloads</span>
                    <span>{formatNumber(model.likes)} likes</span>
                  </div>
                </div>
                
                <Button
                  variant={selectedModel?.id === model.id ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    handleModelSelect(model)
                  }}
                >
                  {selectedModel?.id === model.id ? 'Selected' : 'Select'}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export default HuggingFaceIntegration
