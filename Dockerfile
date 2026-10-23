# ==========================================
# Tahap 1: Build Frontend (Vite SPA)
# ==========================================
FROM node:24-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# Tahap 2: Runtime Backend (FastAPI + Audio Processing)
# ==========================================
FROM python:3.12-slim

# Install system audio codecs (ffmpeg & libsndfile1 for librosa/soundfile)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application backend, data, and audio assets
COPY backend/ ./backend/
COPY data/ ./data/
COPY samples/ ./samples/
COPY audio_alarm/ ./audio_alarm/

# Copy compiled frontend SPA from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Environment variables
ENV PORT=8080
ENV PYTHONPATH=/app/backend
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
