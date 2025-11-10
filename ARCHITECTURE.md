Backend Architecture

This document summarizes the analyzed reference backend and the new backend plan.

Reference Backend (backend-temp) Summary
- Framework: FastAPI
- Key modules:
  - app/main.py: routes for health, hardware, performance, hf-validate, generate, status, videos, video detail, delete, share, file serving
  - config/settings.py: Pydantic-based settings, env management, logging init, validation, .env.example generator
  - middleware/security.py: CORS, security headers, rate limiting, input validation, request logging
  - model/loader.py: local model loader (diffusers + torch)
  - model/generator.py: generation orchestration, HF API fallback, frame enhancement, saving, thumbnail/video creation
  - model/storage.py: file-based storage and metadata
  - utils/hardware.py: GPU/CPU detection and perf estimate
- Auth: optional API key via header/query; rate limiting
- Storage: filesystem under `videos/` with `metadata.json`
- Env vars prefix: `TTG_`; notable: SECRET_KEY, ALLOWED_ORIGINS, STORAGE/MODEL paths, RATE_LIMIT, LOGGING

New Backend (backend/) Plan
- Framework: FastAPI
- Structure:
  - backend/app/main.py
  - backend/app/api/*.py (routers: health, generation, videos, auth placeholder)
  - backend/app/core/config.py (settings via Pydantic, .env.example)
  - backend/app/core/security.py (CORS, headers, rate limiting, logging)
  - backend/app/services/{models,storage,generation}.py
  - backend/app/utils/hardware.py
  - tests/ (pytest) covering endpoints and critical logic
- Security:
  - CORS restricted via settings in prod
  - Security headers
  - Simple API key auth dependency (placeholder), JWT-ready scaffold
  - Rate limiting middleware
  - Input validation via Pydantic models
- Observability:
  - Structured logging
  - Health check endpoint with environment info (dev only fields)
- Storage:
  - Filesystem as in reference, with clear interfaces

Data contracts align with the reference endpoints to keep frontend compatibility.
