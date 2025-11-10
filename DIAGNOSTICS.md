Diagnostics

- Node: frontend ESLint/TS checks passing.
- Python: backend scaffold created; tests pending.
- Security: SECURITY.md added. CORS and headers configured.

Troubleshooting (HF API)

- 401/403 from /hf-validate or /generate when use_hf_api=true
  - Token invalid or missing. Enter a valid HF token in the UI and verify.
- 503/Model loading
  - HF models can be cold-started. Wait for warm-up or try again with “wait_for_model” enabled (already set).
- 200 but unexpected content-type
  - Some models return a JSON error body; the backend surfaces a clear “HF API error” message with status and snippet.
- 200 with MP4 content
  - The backend saves output.mp4, extracts frames, and updates status to completed.

Troubleshooting (Local Mode)

- Local mode produces placeholder video only
  - This is expected. It validates the pipeline without requiring local model installation.
  - To use real local models, replace `_create_placeholder_frames` with a proper pipeline and return frames.

Missing output.mp4

- If frames exist but `output.mp4` is missing, requesting `/videos/{id}/output.mp4` will attempt to stitch the MP4 from saved frames.
