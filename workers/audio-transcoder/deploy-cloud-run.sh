#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${SUPABASE_URL:?Set SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY}"

GCP_REGION="${GCP_REGION:-us-west1}"
GCP_REPOSITORY="${GCP_REPOSITORY:-44-workers}"
GCP_JOB_NAME="${GCP_JOB_NAME:-44-audio-transcoder}"
GCP_IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${GCP_REPOSITORY}/${GCP_JOB_NAME}:latest"

gcloud config set project "${GCP_PROJECT_ID}"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudscheduler.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com
gcloud artifacts repositories describe "${GCP_REPOSITORY}" --location "${GCP_REGION}" >/dev/null 2>&1 \
  || gcloud artifacts repositories create "${GCP_REPOSITORY}" --repository-format docker --location "${GCP_REGION}"
gcloud secrets describe 44-supabase-url >/dev/null 2>&1 \
  || gcloud secrets create 44-supabase-url --replication-policy automatic
gcloud secrets describe 44-supabase-service-role >/dev/null 2>&1 \
  || gcloud secrets create 44-supabase-service-role --replication-policy automatic
printf '%s' "${SUPABASE_URL}" | gcloud secrets versions add 44-supabase-url --data-file=-
printf '%s' "${SUPABASE_SERVICE_ROLE_KEY}" | gcloud secrets versions add 44-supabase-service-role --data-file=-
gcloud builds submit --tag "${GCP_IMAGE}" .
gcloud run jobs deploy "${GCP_JOB_NAME}" --image "${GCP_IMAGE}" --region "${GCP_REGION}" \
  --cpu 2 --memory 2Gi --task-timeout 30m --max-retries 0 --tasks 1 \
  --set-secrets SUPABASE_URL=44-supabase-url:latest,SUPABASE_SERVICE_ROLE_KEY=44-supabase-service-role:latest \
  --set-env-vars AUDIO_BATCH_SIZE=4,AUDIO_JOB_DEADLINE_MINUTES=25,AUDIO_CLEANUP_ENABLED=false

PROJECT_NUMBER="$(gcloud projects describe "${GCP_PROJECT_ID}" --format='value(projectNumber)')"
SCHEDULER_NAME="${GCP_JOB_NAME}-every-minute"
SCHEDULER_URI="https://run.googleapis.com/v2/projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/jobs/${GCP_JOB_NAME}:run"
gcloud scheduler jobs describe "${SCHEDULER_NAME}" --location "${GCP_REGION}" >/dev/null 2>&1 \
  && gcloud scheduler jobs update http "${SCHEDULER_NAME}" --location "${GCP_REGION}" --schedule '* * * * *' --uri "${SCHEDULER_URI}" --http-method POST --oauth-service-account-email "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  || gcloud scheduler jobs create http "${SCHEDULER_NAME}" --location "${GCP_REGION}" --schedule '* * * * *' --uri "${SCHEDULER_URI}" --http-method POST --oauth-service-account-email "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
