# ==========================================
# Stage 1: Build Frontend
# ==========================================
FROM node:20-slim AS frontend-builder

WORKDIR /build

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci --silent

# Build frontend assets
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Final Runtime Environment
# ==========================================
FROM python:3.12-slim

# Install FFmpeg for local video compilation, and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python backend
COPY backend/pyproject.toml backend/
COPY backend/app backend/app
COPY backend/main.py backend/

RUN cd backend && pip install --no-cache-dir -e .

# Copy built frontend assets from Stage 1 into the backend's static directory
COPY --from=frontend-builder /build/dist backend/static

# Copy project diagrams and asset files
COPY asset/ asset/

# Create runtime directories for output and videos
RUN mkdir -p backend/output backend/videos

# Persist output data/database and video folders
VOLUME ["/app/backend/output", "/app/backend/videos"]

EXPOSE 8000

WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
