FROM python:3.12-slim AS builder

WORKDIR /app

# Install dependencies in a virtual environment for cleaner layering
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM python:3.12-slim

# Security: run as non-root
RUN groupadd --gid 1001 muse && \
    useradd --uid 1001 --gid muse --shell /bin/bash --create-home muse

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY app/ ./app/

# Cloud Run sets $PORT (default 8080)
ENV PORT=8080

# Switch to non-root user
USER muse

EXPOSE ${PORT}

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1 --log-level info"]
