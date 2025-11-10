Security Policy

- Do not commit secrets or tokens. Use environment variables.
- Configure allowed CORS origins in production via `TTG_ALLOWED_ORIGINS` (comma-separated).
- Keep your Hugging Face API token in a secret store; inject as env var.
- Disable public docs in production or put behind auth/gateway.
- Report vulnerabilities privately to the maintainers.
- Follow rate limits and input validation guidelines.
