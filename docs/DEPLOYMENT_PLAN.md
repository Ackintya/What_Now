# Deployment Plan — WhatNow Wellness Platform
### Jira: [WHATNOW-DEPLOY] · Author: Charith · Status: Draft · Date: April 2026

---

## 1. Overview

This document defines the production deployment plan for the **WhatNow** wellness platform on **Google Cloud Platform (GCP)**. It covers infrastructure decisions, required pre-deployment work, risk assessment, a phased rollout sequence, success criteria, and rollback procedures.

WhatNow is a monorepo of **8 independent Next.js 14 microservices** sharing a single MongoDB Atlas cluster and a common JWT authentication layer. Each service will be containerized using Docker and deployed to **Google Cloud Run** — a fully managed serverless container platform. Secrets will be managed centrally via **Google Secret Manager**.

### Platform Decision Summary

| Concern | Solution | Rationale |
|---------|----------|-----------|
| **Compute** | Google Cloud Run | Serverless containers, scales to zero, no infrastructure management |
| **Container Registry** | Google Artifact Registry | Native GCP integration, fine-grained IAM control |
| **Secret Management** | Google Secret Manager | Centralized, audited, versioned secrets across all services |
| **Database** | MongoDB Atlas (GCP region: `us-central1`) | Managed, existing cluster — co-locate with Cloud Run region |
| **Networking** | Cloud Run managed ingress (HTTPS by default) | No load balancer setup needed for initial deployment |
| **Custom Domain** | Google Cloud Load Balancing + Cloud DNS | Optional — required for cross-service cookie sharing |
| **CI/CD** | Cloud Build | Future sprint — manual `gcloud` CLI deploys for initial launch |

---

## 2. Scope

### In Scope
- Containerizing all 8 microservices with production-grade `Dockerfile`s
- Deploying all 8 services to **Google Cloud Run**
- Pushing Docker images to **Google Artifact Registry**
- Storing all secrets in **Google Secret Manager**
- Configuring **MongoDB Atlas** network access for GCP Cloud Run IPs
- Configuring **cross-service authentication** via shared JWT cookies
- End-to-end verification of all services post-deployment

### Out of Scope
- Custom domain + Cloud Load Balancer setup (Phase 7 — can be deferred)
- CI/CD pipeline via Cloud Build (future sprint)
- Load testing / performance benchmarking (future sprint)
- PWA / offline mode (backlog)
- Wearables integration (backlog)

---

## 3. GCP Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                           │
│                    Project: whatnow-prod                           │
│                                                                    │
│  ┌─────────────────────┐    ┌────────────────────────────────┐    │
│  │  Artifact Registry  │    │       Secret Manager           │    │
│  │  (Docker Images)    │    │  JWT_SECRET, MONGODB_URI,      │    │
│  └──────────┬──────────┘    │  GEMINI_API_KEY, YELP_API_KEY │    │
│             │               └───────────────┬────────────────┘    │
│             ▼ pull                          │ mounted at runtime   │
│  ┌──────────────────────────────────────────▼──────────────────┐  │
│  │                      Cloud Run                              │  │
│  │                                                             │  │
│  │  [whatnow-base]  [whatnow-skin-hair]  [whatnow-nutrition]  │  │
│  │  [whatnow-yelp-api]  [whatnow-restaurants]                 │  │
│  │  [whatnow-community-api]  [whatnow-community]              │  │
│  │  [whatnow-dashboard]                                       │  │
│  └─────────────────────────────┬───────────────────────────────┘  │
└────────────────────────────────│───────────────────────────────────┘
                                 │ (TLS, dynamic IPs)
              ┌──────────────────▼──────────────────┐
              │           MongoDB Atlas              │
              │  Cluster: cluster0.xgi3nyd           │
              │  Region: GCP us-central1             │
              │  DB: wellbeing_app | skin_hair       │
              └─────────────────────────────────────┘
```

**Authentication model:** User logs in at `whatnow-base` Cloud Run service → JWT set as httpOnly cookie → all other Cloud Run services verify the cookie independently using the shared `JWT_SECRET` from Secret Manager.

> **Cross-service cookie note:** Cloud Run services each get their own `*.run.app` domain. Cookies cannot be shared across different root domains. A **custom domain with subdomains** (e.g., `app.whatnow.io`, `nutrition.whatnow.io`) is required for seamless SSO. See Section 11 and Phase 6.

---

## 4. Service Inventory

| # | Service | Repo Path | Cloud Run Service Name | Database | Port |
|---|---------|-----------|------------------------|----------|------|
| 1 | Main App | `base/` | `whatnow-base` | `wellbeing_app` | 8080 |
| 2 | Skin & Hair | `skin-hair-analysis/` | `whatnow-skin-hair` | `skin_hair` | 8080 |
| 3 | Nutrition | `nutrition-wellness/` | `whatnow-nutrition` | `wellbeing_app` | 8080 |
| 4 | Yelp API | `nutrition-yelp/backend/` | `whatnow-yelp-api` | `wellbeing_app` | 8080 |
| 5 | Restaurants UI | `nutrition-yelp/frontend/` | `whatnow-restaurants` | — | 8080 |
| 6 | Community API | `community/backend/` | `whatnow-community-api` | `wellbeing_app` | 8080 |
| 7 | Community UI | `community/frontend/` | `whatnow-community` | — | 8080 |
| 8 | Dashboard | `fitness-dashboard/` | `whatnow-dashboard` | `wellbeing_app` | 8080 |

> All Cloud Run services use **port 8080** — this is the GCP standard and will be set via the `PORT` environment variable in each container.

---

## 5. Pre-Deployment Requirements

All items below are **blocking** — deployment cannot begin until all are resolved.

### 5.1 GCP Project Setup

| Task | Command / Action |
|------|-----------------|
| Create GCP project | `gcloud projects create whatnow-prod --name="WhatNow Production"` |
| Set active project | `gcloud config set project whatnow-prod` |
| Enable required APIs | See Phase 1 |
| Link billing account | GCP Console → Billing |

### 5.2 Security — Credential Rotation

| Issue | Status | Action Required |
|-------|--------|-----------------|
| MongoDB credentials committed to Git | 🔴 **Blocking** | Rotate password in Atlas → Database Access immediately |
| `JWT_SECRET` not set for production | 🔴 **Blocking** | Generate new 128-char hex secret, store in Secret Manager |
| `.env.local` files may not be gitignored in all services | 🟡 Verify | Run gitignore check across all 8 service directories |

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5.3 Code Changes — Required Before Containerization

| File | Change | Why |
|------|--------|-----|
| **All 8** `next.config.js` | Add `output: 'standalone'` | Required for Docker standalone builds — reduces image size by ~80% |
| `base/src/components/Navigation.tsx` | Replace `localhost` URLs with `NEXT_PUBLIC_*` env vars | Navigation breaks in production without this |
| `base/src/app/page.tsx` | Replace `localhost` hrefs with `NEXT_PUBLIC_*` env vars | Homepage feature card links break in production |
| `community/backend/package.json` | Change port `3005` → `3007` | Resolves local port conflict with `fitness-dashboard` |
| `base/src/app/api/auth/login/route.ts` | Add `domain: process.env.COOKIE_DOMAIN` to cookie setter | Required for cross-subdomain auth with custom domain |

### 5.4 Dockerfile Required — Each Service

A `Dockerfile` must be created at the root of each service directory before any Cloud Run deployment. See Phase 2 for the standard template.

### 5.5 Infrastructure

| Item | Action |
|------|--------|
| MongoDB Atlas Network Access | Add `0.0.0.0/0` — Cloud Run uses dynamic IPs |
| MongoDB Atlas region | Ensure cluster is in `GCP / us-central1` for lowest latency |
| Performance indexes | Create indexes on `email`, `userId`, `createdAt` in key collections |

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cross-service auth fails on separate `.run.app` domains | **High** | **High** | Implement custom domain with subdomains before launch (Phase 6). Without it, each service requires a separate login. |
| Committed MongoDB credentials exploited | **High** | **Critical** | Rotate MongoDB password as **first action** before any other work begins |
| Docker build failure due to missing `standalone` config | **High** | **Medium** | Add `output: 'standalone'` to all `next.config.js` files; test builds locally |
| Cold start latency on Cloud Run (first request after idle) | **Medium** | **Low** | Set minimum instances to 1 for `base` service; accept cold starts on others |
| `JWT_SECRET` mismatch across Cloud Run services | **Medium** | **High** | Use a single Secret Manager secret — all services reference the same resource, no copy-paste |
| MongoDB Atlas connection pool exhaustion on Cloud Run | **Medium** | **Medium** | Cloud Run spins up many instances; use connection pooling with `maxPoolSize: 10` in MongoDB client |
| Gemini or Yelp API quota hit in production | **Low** | **Medium** | Monitor API usage dashboards; add exponential backoff retry logic |
| Image size too large / build timeout in Artifact Registry | **Low** | **Low** | Use multi-stage Dockerfile with `node:20-alpine`; standalone output minimizes final image |

---

## 7. Deployment Phases

---

### Phase 1 — GCP Project & API Setup
**Estimated time:** 1 hour  
**Owner:** Charith

- [ ] Create GCP project `whatnow-prod` and link billing account
- [ ] Enable required GCP APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com
```

- [ ] Create Artifact Registry repository for Docker images:

```bash
gcloud artifacts repositories create whatnow-images \
  --repository-format=docker \
  --location=us-central1 \
  --description="WhatNow production Docker images"
```

- [ ] Authenticate Docker with Artifact Registry:

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

---

### Phase 2 — Security Hardening
**Estimated time:** 1–2 hours  
**Owner:** Charith

- [ ] Rotate MongoDB Atlas password (do this first, before any other step)
- [ ] Generate new `JWT_SECRET` using Node.js crypto module
- [ ] Store all secrets in **Google Secret Manager**:

```bash
# Store each secret (replace <VALUE> with actual values)
echo -n "<JWT_SECRET_VALUE>"    | gcloud secrets create JWT_SECRET    --data-file=-
echo -n "<MONGODB_URI_VALUE>"   | gcloud secrets create MONGODB_URI   --data-file=-
echo -n "<GEMINI_API_KEY>"      | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "<YELP_API_KEY>"        | gcloud secrets create YELP_API_KEY  --data-file=-
```

- [ ] Verify `.env.local` is gitignored in all 8 services
- [ ] Confirm no secrets remain in any committed file

---

### Phase 3 — Code Changes & Dockerfiles
**Estimated time:** 3–5 hours  
**Owner:** Charith

#### 3.1 — Add `standalone` output to all `next.config.js` files

In every service's `next.config.js`, add:
```js
const nextConfig = {
  output: 'standalone',  // Add this line
  // ... existing config
}
```

#### 3.2 — Fix hardcoded `localhost` URLs
- Update `Navigation.tsx` and `page.tsx` in `base/` to use `NEXT_PUBLIC_*` env vars (see pre-deployment requirements)
- Fix `community/backend` port from `3005` → `3007`

#### 3.3 — Create `Dockerfile` in each service directory

Use this standard template for all 8 services:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080

CMD ["node", "server.js"]
```

#### 3.4 — Build verification

Run `npm run build` locally on all 8 services before building Docker images:
```bash
cd base                       && npm run build && cd ..
cd skin-hair-analysis         && npm run build && cd ..
cd nutrition-wellness         && npm run build && cd ..
cd nutrition-yelp/backend     && npm run build && cd ..
cd nutrition-yelp/frontend    && npm run build && cd ..
cd community/backend          && npm run build && cd ..
cd community/frontend         && npm run build && cd ..
cd fitness-dashboard          && npm run build && cd ..
```

---

### Phase 4 — MongoDB Atlas Setup
**Estimated time:** 30 minutes  
**Owner:** Charith

- [ ] Add `0.0.0.0/0` to MongoDB Atlas Network Access (Cloud Run uses dynamic IPs that cannot be individually whitelisted)
- [ ] Confirm Atlas cluster region is GCP `us-central1` for lowest latency
- [ ] Verify all collections exist in both databases
- [ ] Create performance indexes:

```js
// In wellbeing_app
db.users.createIndex({ email: 1 }, { unique: true })
db.sessions.createIndex({ userId: 1, createdAt: -1 })
db.nutrition_recipes.createIndex({ userId: 1 })
db.nutrition_pantry_items.createIndex({ userId: 1 })

// In skin_hair
db.analyses.createIndex({ userId: 1, createdAt: -1 })
db.profiles.createIndex({ userId: 1 })
```

---

### Phase 5 — Build & Deploy to Cloud Run
**Estimated time:** 3–4 hours  
**Deploy order:** Always deploy backend services before their dependent frontends.

| Step | Service | Cloud Run Name | Depends On |
|------|---------|---------------|------------|
| 1 | `base/` | `whatnow-base` | MongoDB Atlas, Secret Manager |
| 2 | `skin-hair-analysis/` | `whatnow-skin-hair` | `whatnow-base` URL |
| 3 | `nutrition-wellness/` | `whatnow-nutrition` | `whatnow-base` URL |
| 4 | `nutrition-yelp/backend/` | `whatnow-yelp-api` | MongoDB Atlas, Yelp API key |
| 5 | `nutrition-yelp/frontend/` | `whatnow-restaurants` | Steps 1 + 4 URLs |
| 6 | `community/backend/` | `whatnow-community-api` | MongoDB Atlas |
| 7 | `community/frontend/` | `whatnow-community` | Steps 1 + 6 URLs |
| 8 | `fitness-dashboard/` | `whatnow-dashboard` | `whatnow-base` URL |

#### Deploy command template (repeat for each service):

```bash
# 1. Build and push Docker image
SERVICE=whatnow-base          # Change this per service
DIR=base                      # Change this per service

docker build -t us-central1-docker.pkg.dev/whatnow-prod/whatnow-images/$SERVICE:latest ./$DIR
docker push us-central1-docker.pkg.dev/whatnow-prod/whatnow-images/$SERVICE:latest

# 2. Deploy to Cloud Run
gcloud run deploy $SERVICE \
  --image us-central1-docker.pkg.dev/whatnow-prod/whatnow-images/$SERVICE:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-secrets="JWT_SECRET=JWT_SECRET:latest,MONGODB_URI=MONGODB_URI:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

> **Min instances:** Set `--min-instances 1` for `whatnow-base` only to eliminate cold starts on the auth service. All other services can scale to zero.

#### Record all production URLs after each deployment:

```
whatnow-base           →  https://whatnow-base-<hash>-uc.a.run.app
whatnow-skin-hair      →  https://whatnow-skin-hair-<hash>-uc.a.run.app
whatnow-nutrition      →  https://whatnow-nutrition-<hash>-uc.a.run.app
whatnow-yelp-api       →  https://whatnow-yelp-api-<hash>-uc.a.run.app
whatnow-restaurants    →  https://whatnow-restaurants-<hash>-uc.a.run.app
whatnow-community-api  →  https://whatnow-community-api-<hash>-uc.a.run.app
whatnow-community      →  https://whatnow-community-<hash>-uc.a.run.app
whatnow-dashboard      →  https://whatnow-dashboard-<hash>-uc.a.run.app
```

---

### Phase 6 — Post-Deployment Wiring
**Estimated time:** 30–60 minutes

After all 8 services are deployed and all production URLs are known:

- [ ] Update `whatnow-base` with all `NEXT_PUBLIC_*_URL` values → **Redeploy**:

```bash
gcloud run services update whatnow-base \
  --update-env-vars="NEXT_PUBLIC_DASHBOARD_URL=https://...,NEXT_PUBLIC_NUTRITION_URL=https://..." \
  --region us-central1
```

- [ ] Update `whatnow-restaurants` with `NEXT_PUBLIC_BACKEND_URL` (yelp API URL) → **Redeploy**
- [ ] Update `whatnow-community` with `NEXT_PUBLIC_BACKEND_URL` (community API URL) → **Redeploy**

---

### Phase 7 — Verification
**Estimated time:** 1 hour

Run through the full verification checklist in Section 9.

---

## 8. Environment Variables & Secrets

### Secret Manager vs. Environment Variables

| Type | Managed Via | Examples |
|------|-------------|---------|
| **Secrets** (sensitive) | Google Secret Manager | `JWT_SECRET`, `MONGODB_URI`, `GEMINI_API_KEY`, `YELP_API_KEY` |
| **Config** (non-sensitive) | Cloud Run `--set-env-vars` | `MONGODB_DB`, `PORT`, `NEXT_PUBLIC_*` URLs, `NODE_ENV` |

> Secrets are mounted at runtime via `--set-secrets` in the `gcloud run deploy` command. They never appear in plaintext in the Cloud Console environment variable list.

---

### Per-Service Configuration

#### `whatnow-base`
| Variable | Type | Value |
|----------|------|-------|
| `MONGODB_URI` | Secret | Secret Manager: `MONGODB_URI:latest` |
| `MONGODB_DB` | Env var | `wellbeing_app` |
| `GEMINI_API_KEY` | Secret | Secret Manager: `GEMINI_API_KEY:latest` |
| `JWT_SECRET` | Secret | Secret Manager: `JWT_SECRET:latest` |
| `JWT_EXPIRES_IN` | Env var | `7d` |
| `COOKIE_DOMAIN` | Env var | `.whatnow.io` *(if using custom domain)* |
| `NEXT_PUBLIC_APP_URL` | Env var | Cloud Run service URL for base |
| `NEXT_PUBLIC_DASHBOARD_URL` | Env var | Cloud Run URL for dashboard |
| `NEXT_PUBLIC_NUTRITION_URL` | Env var | Cloud Run URL for nutrition |
| `NEXT_PUBLIC_RESTAURANTS_URL` | Env var | Cloud Run URL for restaurants |
| `NEXT_PUBLIC_SKIN_HAIR_URL` | Env var | Cloud Run URL for skin-hair |
| `NEXT_PUBLIC_COMMUNITY_URL` | Env var | Cloud Run URL for community |

#### `whatnow-skin-hair`
| Variable | Type | Value |
|----------|------|-------|
| `MONGODB_URI` | Secret | `MONGODB_URI:latest` |
| `MONGODB_DB` | Env var | `skin_hair` |
| `GEMINI_API_KEY` | Secret | `GEMINI_API_KEY:latest` |
| `JWT_SECRET` | Secret | `JWT_SECRET:latest` |
| `NEXT_PUBLIC_BASE_URL` | Env var | Cloud Run URL for base |

#### `whatnow-nutrition`
| Variable | Type | Value |
|----------|------|-------|
| `MONGODB_URI` | Secret | `MONGODB_URI:latest` |
| `MONGODB_DB` | Env var | `wellbeing_app` |
| `GEMINI_API_KEY` | Secret | `GEMINI_API_KEY:latest` |
| `JWT_SECRET` | Secret | `JWT_SECRET:latest` |
| `NUTRITION_MEMORY_CRON_SECRET` | Secret | Separate secret |

#### `whatnow-yelp-api`
| Variable | Type | Value |
|----------|------|-------|
| `MONGODB_URI` | Secret | `MONGODB_URI:latest` |
| `GEMINI_API_KEY` | Secret | `GEMINI_API_KEY:latest` |
| `YELP_API_KEY` | Secret | `YELP_API_KEY:latest` |

#### `whatnow-restaurants`
| Variable | Type | Value |
|----------|------|-------|
| `JWT_SECRET` | Secret | `JWT_SECRET:latest` |
| `NEXT_PUBLIC_BACKEND_URL` | Env var | Cloud Run URL for yelp-api |
| `NEXT_PUBLIC_BASE_URL` | Env var | Cloud Run URL for base |

#### `whatnow-community-api`
| Variable | Type | Value |
|----------|------|-------|
| `MONGODB_URI` | Secret | `MONGODB_URI:latest` |
| `GEMINI_API_KEY` | Secret | `GEMINI_API_KEY:latest` |
| `JWT_SECRET` | Secret | `JWT_SECRET:latest` |

#### `whatnow-community`
| Variable | Type | Value |
|----------|------|-------|
| `JWT_SECRET` | Secret | `JWT_SECRET:latest` |
| `NEXT_PUBLIC_BACKEND_URL` | Env var | Cloud Run URL for community-api |
| `NEXT_PUBLIC_BASE_URL` | Env var | Cloud Run URL for base |

#### `whatnow-dashboard`
| Variable | Type | Value |
|----------|------|-------|
| `MONGODB_URI` | Secret | `MONGODB_URI:latest` |
| `MONGODB_DB` | Env var | `wellbeing_app` |
| `GEMINI_API_KEY` | Secret | `GEMINI_API_KEY:latest` |
| `JWT_SECRET` | Secret | `JWT_SECRET:latest` |
| `NEXT_PUBLIC_BASE_URL` | Env var | Cloud Run URL for base |

---

## 9. Verification Checklist

### Infrastructure
- [ ] All 8 Cloud Run services show status: **Ready**
- [ ] All 8 Docker images exist in Artifact Registry (`whatnow-images` repo)
- [ ] All secrets exist in Secret Manager with at least one active version
- [ ] MongoDB Atlas shows active connections from Cloud Run IPs
- [ ] No `.env.local` files or API keys appear in the GitHub repository

### Authentication
- [ ] User can register at the `whatnow-base` Cloud Run URL
- [ ] Login succeeds — auth cookie visible in browser DevTools → Application → Cookies
- [ ] Navigating to any microservice URL while logged in shows authenticated state
- [ ] Logout removes the cookie; all protected routes redirect to login

### Feature Smoke Tests

| Feature | Service | Test |
|---------|---------|------|
| Homepage loads | base | Full-screen carousel renders, all nav links visible |
| Fitness tracker | base | Webcam starts, MediaPipe detects body pose in real time |
| Skin analysis | skin-hair | Upload photo → Gemini returns AI analysis result |
| Hair analysis | skin-hair | Upload photo → Gemini returns hair health result |
| Meal planning | nutrition | Enter pantry items → AI meal plan generated |
| Restaurant search | restaurants | Search by location → results and health scores render |
| Community posts | community | Create a post → post visible in community feed |
| Fitness dashboard | dashboard | Session history shown in charts |
| WellBeing Agent | all services | Chat widget visible and responds to wellness questions |

---

## 10. Rollback Plan

Cloud Run maintains a full revision history per service. Rollback is per-service and takes under 60 seconds:

```bash
# List all revisions for a service
gcloud run revisions list --service whatnow-base --region us-central1

# Roll back to a specific previous revision
gcloud run services update-traffic whatnow-base \
  --to-revisions whatnow-base-00002-xyz=100 \
  --region us-central1
```

**Database rollback:**
- MongoDB Atlas (paid tier) supports point-in-time restore
- No destructive database migrations are part of this deployment — rollback risk is low
- If a migration is added in future, a pre-migration snapshot must be taken in Atlas

---

## 11. Open Questions / Decisions Required

| # | Question | Decision Needed By | Impact |
|---|----------|-------------------|--------|
| 1 | **Custom domain or `.run.app` for launch?** | Before Phase 5 | Critical — `.run.app` domains are per-service and cannot share cookies. Without a custom domain, users must log in separately on each service. |
| 2 | **GCP project billing account** — who owns it? | Before Phase 1 | Cloud Run and Artifact Registry incur costs; billing must be set up before deploying |
| 3 | **Service account IAM** — should each Cloud Run service have its own service account with least-privilege access to Secret Manager? | Before Phase 2 | Security best practice; adds ~30 min to Phase 2 |
| 4 | **Minimum instances for `whatnow-base`**: Set to 1 (always warm, ~$5/month) or 0 (free but cold starts on first login)? | Before Phase 5 | UX vs. cost tradeoff |
| 5 | **Staging environment**: Deploy to a `whatnow-staging` GCP project before production, or deploy directly to prod? | Before Phase 5 | Adds ~1 day of effort but significantly reduces production incident risk |
| 6 | **Who holds the MongoDB Atlas admin credentials and GCP project Owner role?** | Before Phase 1 | Single point of failure — needs secure handoff and documented ownership |

---

## 12. Timeline Estimate

| Phase | Effort | Notes |
|-------|--------|-------|
| Phase 1 — GCP Setup | ~1 hr | Project creation, API enablement, Artifact Registry |
| Phase 2 — Security | ~1–2 hrs | Credential rotation, Secret Manager setup |
| Phase 3 — Code & Docker | ~3–5 hrs | `standalone` config, URL fixes, Dockerfiles, local build verification |
| Phase 4 — MongoDB Setup | ~30 min | Network access, indexing |
| Phase 5 — Cloud Run Deploy | ~3–4 hrs | Build + push + deploy × 8 services |
| Phase 6 — Wiring | ~30–60 min | Cross-service URL injection, redeployments |
| Phase 7 — Verification | ~1 hr | Full smoke test across all services |
| **Total** | **~10–14 hrs** | Single engineer, no blockers. Add ~1 day with staging env. |

---

## 13. Appendix — Useful Links

| Resource | URL |
|----------|-----|
| GCP Console | https://console.cloud.google.com |
| Cloud Run Docs | https://cloud.google.com/run/docs |
| Artifact Registry Docs | https://cloud.google.com/artifact-registry/docs |
| Secret Manager Docs | https://cloud.google.com/secret-manager/docs |
| MongoDB Atlas | https://cloud.mongodb.com |
| Google AI Studio (Gemini keys) | https://aistudio.google.com |
| Yelp Developer Console | https://www.yelp.com/developers |
| GitHub Repo | https://github.com/charithcherry/What_Now |
| Full Operational Guide | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| Project Jira Backlog | [JIRA_BACKLOG.md](./JIRA_BACKLOG.md) |
