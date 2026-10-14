# Project Henry online download engine (experimental)

This is a separate container API for the static Project Henry site. It uses yt-dlp and FFmpeg on a small Node.js server. It is **not deployed** by Cloudflare Pages and it is not a production-grade multi-user service.

## Current behavior

- Authenticated API using a long random bearer token.
- HTTPS-only submitted URLs and administrator-configured hostname allowlist.
- One download process at a time, bounded queue, configurable size/time limits.
- Temporary files and in-memory job state; completed files are removed after about one hour.
- No playlists, no user-supplied shell commands, and no arbitrary output paths.

The allowlist is a first layer of protection, not a guarantee against every SSRF or abuse scenario. Only enable domains you trust, and do not publish the API token in the website source. A token entered by a user is stored only in that user's browser if the frontend opts to remember it. Do not share one public token with untrusted users.

Use this only for content you own, have permission to download, or that the source platform expressly permits you to download. Do not use it to bypass DRM, paywalls, login restrictions, or other access controls. Review the terms of each source platform.

## Lowest-cost trial: Render Free (experimental)

For an initial proof-of-concept, Render's free web service is simpler to try than setting up Google Cloud billing. Free services have significant limitations: they spin down after 15 minutes without inbound traffic, local files are ephemeral and can be lost on restart/spin-down, and bandwidth/build allowances apply. This is suitable only for a controlled test, not a dependable public download service. Review the current [Render free service limits](https://render.com/docs/free) before proceeding.

1. Sign in to Render and choose **New → Web Service**. Connect this repository and select the `feature/project-henry-downloader` branch for the test.
2. Choose **Docker** as the runtime. Set the Dockerfile path to `downloader-engine/Dockerfile` and the Docker build context to `downloader-engine` if the dashboard asks for it.
3. Select the **Free** instance type. If the dashboard requests payment details or shows any paid service/plan, stop and review before confirming.
4. Add these environment variables in the Render dashboard: `ALLOWED_ORIGINS=https://henrymuli.pages.dev`, `ALLOWED_DOMAINS=youtube.com,youtu.be` (or your carefully reviewed permitted source domains), `MAX_QUEUE_SIZE=2`, `MAX_DOWNLOAD_MB=100`, and `JOB_TIMEOUT_SECONDS=300`.
5. Generate a long random secret locally and add it as `ENGINE_API_TOKEN`. Do not commit the token to GitHub, put it in the frontend code, or share it publicly.
6. Deploy and wait for the service URL. Open `https://YOUR-SERVICE.onrender.com/health`; it should return JSON with `"ok":true`.
7. In Project Henry's Downloader page, enter that service URL and the token, test the connection, and enable online-engine mode. Start with a small file from a domain you are allowed to download from.

**Important:** keep the first test small. The free instance may be memory-limited, can restart without warning, and does not preserve completed files reliably. Downloads can consume outbound bandwidth; Render may suspend free services after included allowances are exhausted rather than bill a workspace without a payment method, but check the current plan terms. A token manually entered into the page is visible to the person using that browser, so do not use this prototype as a shared public service.

## Deploy to Google Cloud Run (free-tier eligible, not guaranteed free)

Cloud Run can scale to zero and has a free usage allowance, but a billing account may be required and usage beyond the allowance can incur charges. Container builds, network egress, and heavy downloads may cost money. Set a budget alert before deploying. This repository does not deploy itself.

1. Create a long random token locally, for example with openssl rand -hex 32. Keep it secret.
2. Review ALLOWED_DOMAINS. The default example is deliberately narrow. Only add platforms you are allowed to download from.
3. Build and deploy this folder as a Cloud Run service using the included Dockerfile.
4. Configure environment variables in Cloud Run: ENGINE_API_TOKEN, ALLOWED_ORIGINS=https://henrymuli.pages.dev, ALLOWED_DOMAINS=..., MAX_QUEUE_SIZE=8, MAX_DOWNLOAD_MB=500, and JOB_TIMEOUT_SECONDS=900.
5. Set Cloud Run maximum instances to 1 and concurrency to 1 for this prototype. Restrict unauthenticated use at the platform layer if practical; the API also requires its bearer token.
6. Test /health, then test one permitted URL. Do not place the token in public source code or screenshots.

Example using Google Cloud CLI from the repository root:

    gcloud run deploy project-henry-download-engine \
      --source downloader-engine \
      --region YOUR_REGION \
      --allow-unauthenticated \
      --max 1 \
      --concurrency 1 \
      --set-env-vars ALLOWED_ORIGINS=https://henrymuli.pages.dev,ALLOWED_DOMAINS=youtube.com\\,youtu.be,MAX_QUEUE_SIZE=8,MAX_DOWNLOAD_MB=500,JOB_TIMEOUT_SECONDS=900 \
      --set-secrets ENGINE_API_TOKEN=project-henry-engine-token:latest

Create the Secret Manager secret before deploying. If the platform blocks unauthenticated requests, configure the appropriate platform access separately; the API token is still required. Never use a public token.

## API

- GET /health — health check (no token).
- POST /api/jobs — JSON body {"url":"https://allowed.example/path"}; returns a queued job.
- GET /api/jobs/:id — status.
- GET /api/jobs/:id/download — retrieve the finished file.
- DELETE /api/jobs/:id — cancel queued/running job.

Authenticated requests must include Authorization: Bearer YOUR_TOKEN.

## Prototype limitations

Job state is in memory and files are ephemeral. A service restart loses the queue and may remove files. This is appropriate only for controlled testing; persistent queues, per-user identity, stronger SSRF defenses, quotas, monitoring, and a storage lifecycle policy are needed before public launch.
