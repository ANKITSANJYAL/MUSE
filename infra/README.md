# Project Muse — Deployment Guide

## Prerequisites

1. **Google Cloud SDK** (`gcloud`) installed and authenticated
2. **Terraform** >= 1.5 installed
3. **Docker** installed (for local container builds)
4. A GCP project with billing enabled

## Quick Start — Manual Deployment with gcloud

### 1. Authenticate and Set Project

```bash
# Login and set your project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 2. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create project-muse-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Project Muse Docker images"
```

### 3. Build and Push the Container

```bash
# From the project root
cd backend

# Configure Docker for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/project-muse-repo/project-muse:latest .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/project-muse-repo/project-muse:latest
```

### 4. Deploy to Cloud Run

```bash
gcloud run deploy project-muse \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/project-muse-repo/project-muse:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=5 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,GOOGLE_CLOUD_LOCATION=us-central1" \
  --session-affinity
```

> **Note:** `--session-affinity` ensures WebSocket connections stick to the same instance.

### 5. Update Frontend WebSocket URL

After deployment, update `NEXT_PUBLIC_WS_URL` in the frontend:

```bash
# Get the Cloud Run URL
SERVICE_URL=$(gcloud run services describe project-muse --region=us-central1 --format='value(status.url)')

# For the frontend, replace https:// with wss://
echo "Set NEXT_PUBLIC_WS_URL=${SERVICE_URL/https/wss}/ws"
```

---

## Terraform Deployment

### 1. Initialize and Plan

```bash
cd infra

terraform init
terraform plan -var="project_id=YOUR_PROJECT_ID"
```

### 2. Apply

```bash
terraform apply -var="project_id=YOUR_PROJECT_ID"
```

### 3. Build and Deploy the Container

After Terraform creates the infrastructure, build and push the image:

```bash
# Get the repo path from Terraform output
REPO=$(terraform output -raw artifact_registry_repo)

cd ../backend
gcloud auth configure-docker us-central1-docker.pkg.dev
docker build -t ${REPO}/project-muse:latest .
docker push ${REPO}/project-muse:latest

# Redeploy Cloud Run to pick up the new image
gcloud run services update project-muse --region=us-central1 \
  --image=${REPO}/project-muse:latest
```

---

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt

# Set up ADC
gcloud auth application-default login

# Optional: set env vars
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1

# Run
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## Environment Variables

| Variable | Backend | Frontend | Description |
|---|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | ✅ | — | GCP project ID |
| `GOOGLE_CLOUD_LOCATION` | ✅ | — | GCP region (default: `us-central1`) |
| `GEMINI_MODEL` | ✅ | — | Gemini model (default: `gemini-2.0-flash-live-001`) |
| `IMAGEN_MODEL` | ✅ | — | Imagen model (default: `imagen-3.0-generate-002`) |
| `CORS_ORIGINS` | ✅ | — | Allowed CORS origins (JSON array) |
| `NEXT_PUBLIC_WS_URL` | — | ✅ | Backend WebSocket URL |
