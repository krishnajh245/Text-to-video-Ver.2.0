# VisionCraft AI

> Transform text into stunning AI-generated videos with cutting-edge technology

VisionCraft AI is a modern web application that leverages state-of-the-art AI models to generate videos from text prompts. Built with a futuristic design system and robust architecture, it provides both local GPU acceleration and cloud-based processing options.

## ✨ Features

- 🎬 **Text-to-Video Generation** - Create videos from detailed text descriptions
- ⚡ **Hardware Acceleration** - GPU-accelerated processing with CPU fallback
- 🎨 **Modern UI/UX** - Futuristic "Nebula Minimal" design system
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile
- 🔍 **Video Gallery** - Search, filter, and manage your generated content
- 🚀 **Real-time Progress** - Live updates during video generation
- ☁️ **Cloud Integration** - Hugging Face API support for scalable processing

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Router** for navigation
- **Lucide React** for icons

### Backend
- **FastAPI** (Python)
- **Hugging Face** API integration (image → motion synthesis pipeline)
- **OpenCV/Pillow** for frame and video processing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/aurora-video-ai.git
cd aurora-video-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Backend Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Environment (prefix `TTG_`):
- `ENVIRONMENT` (development|production) – default: development
- `HOST`, `PORT` – default: 0.0.0.0:8000
- `STORAGE_BASE_PATH` – default: ./videos
- `ALLOWED_ORIGINS` – comma-separated origins for production CORS
- `HF_MODEL_REPO` – default: `damo-vilab/text-to-video-ms-1.7b`

Create a local `.env` from the example:

```bash
cp .env.example .env
```

Do not commit your `.env` file.

Key Endpoints:
- `GET /health`, `GET /hardware`, `GET /performance`
- `POST /hf-validate` – validate HF token
- `POST /generate` – start generation (supports HF token, frames/fps/size)
- `GET /status/{job_id}` – job status
- `GET /videos` – list videos
- `GET /videos/{id}/output.mp4`, `GET /videos/{id}/thumbnail.jpg`

## 📁 Project Structure

```
visioncraft-ai/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # FastAPI backend
├── docs/                   # Documentation
│   └── design_system.md    # Design system documentation
├── tasks/                  # Development task tracking
└── README.md
```

## 🎨 Design System

VisionCraft AI uses the "Nebula Minimal" design system:

- **Colors**: Aurora Blue (#00D4FF), Deep Space (#0A0A0F), Nebula Purple (#8B5CF6)
- **Typography**: Inter (primary), JetBrains Mono (secondary)
- **Spacing**: 8px base scale
- **Animations**: Smooth, purposeful micro-interactions

See [Design System Documentation](docs/design_system.md) for complete guidelines.

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Code Quality

This project follows the **Vibe Code Workflow**:
- Clean, readable code that tells a story
- Security-first mindset
- Comprehensive error handling
- Atomic commits with clear messages
- Thorough documentation

## ☁️ Using Hugging Face Inference API (Recommended)

- Toggle “Use Hugging Face Models” in the UI, enter your HF token, and verify.
- Select a text-to-video model (default recommended: `damo-vilab/text-to-video-ms-1.7b`).
- Start generation. The backend will download the MP4 from HF, extract frames, and make `output.mp4` available.

Security:
- Never hardcode tokens in code or config. Provide them at runtime via the UI or environment only.
- `.env` is for app settings, not secrets. Do not commit tokens.

## 🖥️ Local Mode (No Cloud)

If Hugging Face mode is disabled, the backend generates a placeholder motion video derived from your prompt text. This ensures the full pipeline works even without local model installs. To use real local models, integrate a diffusers/torch pipeline in place of the placeholder function.

## 📋 Roadmap

### Phase 1: Frontend MVP ✅
- [x] Design system implementation
- [x] Core UI components
- [ ] Video generation interface
- [ ] Video gallery and management
- [ ] Responsive design

### Phase 2: Backend Integration
- [ ] FastAPI server setup
- [ ] AI model integration
- [ ] Hardware detection
- [ ] Video processing pipeline

### Phase 3: Advanced Features
- [ ] Cloud API integration
- [ ] Performance optimization
- [ ] Advanced video parameters
- [ ] User authentication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AI models powered by Hugging Face
- Design inspiration from modern tech interfaces
- Built with love for the creative community

---

**VisionCraft AI** - Where creativity meets artificial intelligence ✨
