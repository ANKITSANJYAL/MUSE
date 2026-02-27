# ─────────────────────────────────────────────────────────────────────────────
# Project Muse — Terraform Infrastructure
# Enables Vertex AI APIs and deploys the FastAPI backend to Cloud Run
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# ── Provider ──────────────────────────────────────────────────────────────────

provider "google" {
  project = var.project_id
  region  = var.region
}

# ── Enable APIs ───────────────────────────────────────────────────────────────

resource "google_project_service" "vertex_ai" {
  service            = "aiplatform.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifact_registry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_build" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# ── Artifact Registry ─────────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "muse" {
  location      = var.region
  repository_id = "${var.service_name}-repo"
  description   = "Docker images for Project Muse"
  format        = "DOCKER"

  depends_on = [google_project_service.artifact_registry]
}

# ── Service Account ───────────────────────────────────────────────────────────

resource "google_service_account" "muse_sa" {
  account_id   = "${var.service_name}-sa"
  display_name = "Project Muse Service Account"
}

resource "google_project_iam_member" "vertex_ai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.muse_sa.email}"
}

# ── Cloud Run ─────────────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "muse" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.muse_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.muse.repository_id}/${var.service_name}:latest"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = var.region
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        period_seconds = 30
      }
    }
  }

  depends_on = [
    google_project_service.cloud_run,
    google_project_service.vertex_ai,
  ]
}

# ── Allow unauthenticated access (for demo) ──────────────────────────────────

resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.muse.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
