output "service_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.muse.uri
}

output "service_account_email" {
  description = "Service account email used by the Cloud Run service"
  value       = google_service_account.muse_sa.email
}

output "artifact_registry_repo" {
  description = "Artifact Registry repository path"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.muse.repository_id}"
}
