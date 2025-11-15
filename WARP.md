# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

VisionCraft AI is a text-to-video generator composed of:
- A **React 18 + TypeScript** frontend (`frontend/`) built with Vite and Tailwind, implementing the "Nebula Minimal" design system.
- A **FastAPI** backend (`backend/`) that orchestrates text-to-video generation via Hugging Face Inference API or local-placeholder generation, manages video storage on disk, detects hardware, and tracks model downloads.

The top-level `README.md` describes features, technology stack, and environment variables prefixed with `TTG_`; prefer keeping this file as the source of truth for user-facing docs.

---

## Commands & Workflows

### Frontend (React/Vite)

From the repo root, all commands assume `cd frontend` first.

**Install dependencies**
```bash
cd frontend
npm install
```

**Run dev server (with Vite proxying API calls to the backend)**
```bash
cd frontend
npm run dev
# Serves on http://localhost:3000 by default
```

**Build and preview production bundle**
```bash
cd frontend
npm run build
npm run preview
```

**Lint and type-check**
```bash
cd frontend
npm run lint        # ESLint
npm run type-check  # TypeScript (no emit)
```

There is no configured frontend test runner in `frontend/package.json`; add one (e.g. Vitest/Jest) before expecting `npm test`-style commands to work.

### Backend (FastAPI)

From the repo root, all commands assume `cd backend` first.

**Create and activate virtualenv, install dependencies**
```bash
cd backend
python -m venv .venv
# Windows PowerShell
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
```

**Run FastAPI app with Uvicorn (development)**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Environment (see `README.md` and `backend/app/core/config.py`):
- Env file: `.env` in `backend/`, with prefix `TTG_`.
- Key variables:
  - `TTG_ENVIRONMENT` (`development`/`production`, default `development`)
  - `TTG_HOST`, `TTG_PORT` (default `0.0.0.0:8000`)
  - `TTG_STORAGE_BASE_PATH` (default `./videos` inside backend CWD)
  - `TTG_ALLOWED_ORIGINS` (comma-separated origins, used only in production mode)
  - `TTG_HF_MODEL_REPO` (default `damo-vilab/text-to-video-ms-1.7b`)

A typical backend dev flow is:
1. Copy `.env.example` to `.env` and adjust `TTG_` vars.
2. Start the FastAPI app with Uvicorn.
3. Use `GET /health` and `GET /hardware` to verify the service and hardware detection.

There is no dedicated backend test suite or test runner configured in this repo (no `tests/`, `pytest.ini`, or similar). Add tests (e.g. with `pytest`) before relying on any single-test command.

### Frontend–Backend Integration

- Vite is configured in `frontend/vite.config.ts` to proxy API paths to the backend:
  - `/health`, `/hardware`, `/performance`
  - `/generate`, `/status`, `/hf-validate`
  - `/videos`, `/models`
- By default, these are proxied to `http://127.0.0.1:8000`. You can override with `VITE_BACKEND_URL` in the frontend environment.

To develop end-to-end:
1. Run the backend FastAPI server on port 8000.
2. Run `npm run dev` in `frontend/`.
3. Access the UI at `http://localhost:3000` and the FastAPI docs at `http://localhost:8000/docs`.

---

## High-Level Architecture

### Backend Architecture (`backend/app/`)

**Configuration & initialization**
- `core/config.py`
  - Defines `Settings` (Pydantic `BaseSettings`) with env vars loaded from `.env` and prefixed with `TTG_`.
  - Sets defaults for app metadata (`app_name`, `app_version`), environment, logging, and storage path.
  - `initialize_application()` sets up logging and ensures the storage directory exists.

**Security & middleware**
- `core/security.py`
  - `setup_security_middleware(app, settings)` adds:
    - CORS via `CORSMiddleware` (all origins when not in production; configurable allowed origins in production).
    - `SecurityHeadersMiddleware` for clickjacking/content-type/referrer hardening.
    - `RateLimitMiddleware` with a simple per-IP sliding window in-memory rate limiter.
  - `api_key_dependency` is currently a no-op placeholder, but wired to `/secure-check` for future API key-based auth.

**Hardware detection & performance estimation**
- `utils/hardware.py`
  - `_torch_info()` inspects CUDA availability and GPU details via `torch` if present.
  - `_nvidia_smi_info()` falls back to `nvidia-smi` when CUDA via `torch` is not available.
  - `get_hardware_info()` aggregates CPU core count and GPU info.
  - `estimate_performance()` maps hardware capabilities to coarse performance levels and estimated generation times.

**Video storage and media handling**
- `services/storage.py`
  - `VideoStorage` encapsulates on-disk storage under `storage_base_path` (defaults to `videos/` in the current working dir):
    - Maintains `metadata.json` describing each video (id, params, frame count, timestamps).
    - Persists frames as `frame_XXXX.png` per video, and optionally `output.mp4` and `thumbnail.jpg`.
  - Core responsibilities:
    - `create_video_entry(params)` creates a new video id and directory and records metadata.
    - `update_video_frames(video_id, frame_count)`, `list_videos()`, `get_video(video_id)`, `delete_video(video_id)` manage metadata lifecycle.
    - `_create_video_file(...)` builds an MP4 from an in-memory frame list or from existing PNG frames.
    - `_create_thumbnail(...)` creates a 300×200 JPEG thumbnail from the first frame.
    - `save_video_bytes(...)` writes HF-provided MP4 bytes; `extract_frames_from_video(...)` extracts frames from a video file.

**Model registry and downloads**
- `services/models.py`
  - `LocalModelRegistry` manages disk directories for downloaded models (under `video-gen-models/` by default):
    - Normalizes `repo_id` → directory name, checks if a model is downloaded via presence of non-hidden files.
    - `model_info(repo_id)` returns path, size, and downloaded flag.
    - `start_download(repo_id, token)`
      - Spawns a background thread that uses `huggingface_hub.snapshot_download` to download a snapshot into the model directory.
      - Maintains `download_progress` in-memory (status, progress, message, downloaded bytes) with coarse progress estimation via directory size.
    - `get_download_progress(download_id)` and `get_download_progress_by_repo(repo_id)` expose progress information.
    - `list_active_downloads()` returns all tracked downloads.
  - `get_local_model_registry()` provides a global singleton used by `main.py` and the frontend via HTTP endpoints.

**Video generation pipeline**
- `services/generator.py`
  - `VideoGenerator` coordinates job creation, Hugging Face API calls, frame creation, and persistence:
    - Maintains an in-memory `generation_status` dict keyed by `job_id`, guarded by `_status_lock`.
    - `generate_video(...)` validates parameters, normalizes frame size/resolution, creates a `VideoStorage` entry, initializes status and spawns a worker thread.
    - `_generate_thread(...)` performs the actual work:
      - HF mode (`use_hf_api=True`):
        - `_generate_with_hf_api(...)` sends a request to Hugging Face Inference API (router root and model-specific endpoints) with given prompt and parameters.
        - If HF returns MP4 bytes, `VideoStorage.save_video_bytes` and `extract_frames_from_video` are used; if HF returns an image sequence, those frames are saved directly.
      - Local mode (`use_hf_api=False`):
        - `_generate_with_local_model(...)` currently uses `_create_placeholder_frames(...)` to generate synthetic motion frames from the prompt text (no real local text-to-video model yet).
      - After frames exist (from HF or local placeholder), frames are saved to disk, thumbnails are created, and `VideoStorage.update_video_frames` is called.
  - `_create_placeholder_frames(...)`, `_enhance_image(...)`, `_create_motion_from_base(...)` implement the placeholder local motion effect using PIL and OpenCV.

**FastAPI app & routes**
- `main.py`
  - Application setup:
    - Calls `initialize_application()` and creates `FastAPI` app with settings-driven metadata.
    - Applies security middleware via `setup_security_middleware`.
    - Instantiates `storage`, `generator`, and `model_registry` singletons.
  - Core endpoints:
    - Health and hardware:
      - `GET /health` → basic health + environment metadata.
      - `GET /hardware` → full hardware info from `get_hardware_info()`.
      - `GET /performance` → heuristic performance estimate from `estimate_performance()`.
      - `GET /secure-check` → sample endpoint using `api_key_dependency` (currently a stub).
    - Generation & status:
      - `POST /generate` → accepts `GenerateRequest` (prompt, frames, resolution, HF/local flags, model ids, etc.), validates HF token when `use_hf_api` is `True`, then calls `generator.generate_video(...)`.
      - `GET /status/{job_id}` → reads in-memory generation status under lock.
    - Video listing and serving:
      - `GET /videos` → list metadata from `VideoStorage`.
      - `GET /videos/{video_id}/output.mp4` → serves MP4, generating it from frames if necessary.
      - `GET /videos/{video_id}/thumbnail.jpg` → serves or lazily generates a JPEG thumbnail.
    - Model discovery & downloads:
      - `GET /models/supported` → returns a curated, hard-coded list of recommended text-to-video HF model ids.
      - `GET /models/trending` → proxies to Hugging Face public models API for trending text-to-video models and returns compact metadata.
      - `GET /models/local/status` → uses `model_registry.model_info` to report local model presence and size.
      - `POST /models/local/download` → starts a background download via `LocalModelRegistry.start_download` and returns `download_id`, handling HF token validation and error messaging.
      - `GET /models/local/download/{download_id}/progress` → exposes download progress with better diagnostics, including fallbacks when IDs change or are missing.
      - `GET /models/local/debug` → debug endpoint for registry state (base dir, models, active downloads).
    - HF token validation:
      - `POST /hf-validate` → validates HF token against `https://huggingface.co/api/whoami-v2` and returns structured messages for success and common error codes.

Together, these layers implement: config → hardware & storage services → generation/model registry services → FastAPI routes consumed by the frontend.

### Frontend Architecture (`frontend/src/`)

**Entry point & routing**
- `main.tsx`
  - Uses `ReactDOM.createRoot` with `BrowserRouter` and top-level `App` component.
  - Imports global styles from `index.css`, which are expected to include Tailwind setup and the "Nebula Minimal" design tokens.

**Page-level containers**
- `pages/HomePage.tsx`
  - Primary generation UI:
    - Maintains `VideoGenerationRequest` form state (prompt, resolution, frames, fps, inference steps, guidance scale, selected model).
    - Uses `validateVideoParams` from `utils/index.ts` for client-side validation.
    - On mount, fetches `/health`, `/hardware`, and `/performance` to populate system status cards.
    - Submits generation via `POST /generate`, wiring `use_hf_api`, `hf_token` (from `localStorage`), and `hf_model_repo` from the selected Hugging Face model.
    - Polls `GET /status/{job_id}` until completion or failure and then opens `/videos/{video_id}/output.mp4` in a new tab.
    - Renders parameter sliders, error messages, and generation progress (`ProgressBar`).
    - Displays hardware/performance cards using `/hardware` and `/performance` responses.
  - Uses `HuggingFaceIntegration` for model selection and token management, and UI components from `components/ui` (e.g. `EnhancedButton`, `EnhancedCard`, `Badge`, `Input`).
- `pages/GalleryPage.tsx`, `pages/HardwarePage.tsx`, `pages/VideoDetailPage.tsx`
  - Provide additional views for gallery browsing, hardware info, and per-video details; they rely on the same backend endpoints for metadata and media (patterns consistent with `HomePage` structure).

**Hugging Face integration and model management**
- `components/HuggingFaceIntegration.tsx`
  - Encapsulates both **cloud-mode** and **local-model** UX:
    - Cloud mode:
      - Manages HF API key entry and validation via `/hf-validate`.
      - Fetches curated model ids via `/models/supported` and trending models via `/models/trending`.
      - Presents selectable models with downloads/likes/tags; selected model is passed up to `HomePage`.
      - Persists HF token in `localStorage` for reuse by generation requests.
    - Local mode:
      - Defines a fixed map from local ids (e.g. `zeroscope-local`, `modelscope-local`) to HF `repo_id`s used by the backend registry.
      - Uses `/models/local/status` to display whether each model is downloaded and its approximate size.
      - Initiates downloads via `POST /models/local/download` and polls `/models/local/download/{download_id}/progress` for progress, surfacing detailed error messages.
  - This component is the main glue between frontend UX and backend model registry endpoints.

**Design system & UI primitives**
- `components/ui/`
  - Contains Tailwind-based, reusable UI components (e.g. `Button`, `Card`, `Input`, `EnhancedButton`, `EnhancedCard`, `Badge`, `Modal`, `ProgressBar`, `Spinner`), implementing the "Nebula Minimal" aesthetics described in the README and design docs.
  - These components are used throughout pages to maintain visual and interaction consistency (e.g. glow effects, gradients, particle backgrounds).

**Utility and type layers**
- `utils/index.ts`
  - Provides small, focused utilities for:
    - Class merging (`cn`), file size/duration formatting, relative times.
    - Video param validation (`validateVideoParams`) and heuristic time estimation (`estimateGenerationTime`).
    - Generic helpers like `debounce`, clipboard operations, downloads, touch/mobile detection, contrast color calculation, and text formatting.
  - These are used by pages/components (especially `HomePage`) to keep rendering logic clean.
- `types/index.ts`
  - Defines shared TypeScript interfaces for:
    - Video generation requests/responses (`VideoGenerationRequest`, `VideoGenerationResponse`, `VideoMetadata`).
    - Hardware and performance shapes (`HardwareInfo`).
    - UI component props (`ButtonProps`, `InputProps`, `CardProps`, navigation types, search filters, form state, validation errors).
    - Hugging Face models (`HuggingFaceModel`).
  - This type layer underpins props, state, and API interactions across the app, helping keep React components type-safe.

**Other structure**
- Additional components (`AnimatedSection`, `ParticleBackground`, `Layout`, `Navigation`, `ThemeToggle`, etc.) encapsulate layout, animation, and theming concerns, allowing page components to focus on data flow and user interactions.

---

## Notes for Future Warp Agents

- Use this file plus `README.md` as the primary entry points to understand the project. When modifying behavior, inspect both the React page container and the corresponding FastAPI endpoint to keep the frontend–backend contract in sync.
- When introducing tests, prefer colocating backend tests under `backend/` (e.g. `backend/tests/`) and frontend tests under `frontend/` with an explicit `npm` script, so that future commands can be added here without guessing frameworks.
