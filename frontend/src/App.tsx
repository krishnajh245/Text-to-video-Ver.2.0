import { Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ThemeProvider } from '@/contexts/ThemeContext'
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import GalleryPage from '@/pages/GalleryPage'
import VideoDetailPage from '@/pages/VideoDetailPage'

function App() {
  return (
    <ThemeProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-deep-space light:bg-light-bg transition-colors duration-300"
      >
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/video/:id" element={<VideoDetailPage />} />
          </Routes>
        </Layout>
      </motion.div>
    </ThemeProvider>
  )
}

export default App
