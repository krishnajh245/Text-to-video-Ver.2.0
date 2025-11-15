from fastapi import Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def setup_security_middleware(app, settings):
    allow_origins = ["*"] if settings.environment != "production" else (settings.allowed_origins or ["http://localhost:3000"])
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"]
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware, requests_per_minute=100)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.window = 60
        self.clients = {}
        import threading
        self._lock = threading.Lock()

    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self.window
        
        with self._lock:
            timestamps = self.clients.get(ip, [])
            timestamps = [t for t in timestamps if t >= window_start]
            if len(timestamps) >= self.requests_per_minute:
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            timestamps.append(now)
            self.clients[ip] = timestamps
        
        return await call_next(request)


async def api_key_dependency(authorization: Optional[str] = Header(default=None)):
    # Placeholder API key check (disabled by default)
    return True
