# WhatNow — GCP Deployment Plan

**Platform:** Google Cloud Platform
---

## Services

| Service | Role |
|---------|------|
| Base | User authentication, homepage, and navigation hub |
| Fitness Dashboard | Session history and analytics |
| Nutrition Wellness | Pantry management and meal planning |
| Nutrition Yelp Backend | Restaurant discovery API with AI health scoring |
| Nutrition Yelp Frontend | Restaurant search UI |
| Skin & Hair Analysis | AI-powered skin and hair analysis |
| Community Backend | Community API |
| Community Frontend | Social features and community check-ins |

---

## Infrastructure

| Concern | Solution |
|---------|----------|
| **Hosting** | Google Cloud Run (fully managed, serverless containers) |
| **Container Registry** | Google Artifact Registry |
| **Database** | MongoDB Atlas (existing cluster) |
| **Secret Management** | GCP Secret Manager |
| **Authentication** | Shared JWT secret across all services via secure cookies |

---

## Deployment Approach

Each service is packaged as a Docker container, pushed to Artifact Registry, and deployed as an independent Cloud Run service. Cloud Run automatically handles scaling, HTTPS, and infrastructure management with no servers to manage.

Services communicate by calling each other's Cloud Run URLs, which are passed in as environment variables at deploy time.

---

## Deployment Steps

### 1. GCP Project Setup
Enable Cloud Run, Artifact Registry, and Secret Manager on the GCP project. This is a one-time setup.

### 2. Store Secrets
All sensitive credentials are stored in GCP Secret Manager — never in code or config files. The key secrets are:
- MongoDB connection string
- JWT secret (shared across all 8 services — must be identical everywhere)
- Gemini API key
- Yelp API key

### 3. Database Preparation
MongoDB Atlas must be configured to accept connections from GCP's dynamic IPs. Password rotation is also required if any credentials were previously exposed in the repository.

### 4. Containerize Services
Each of the 8 Next.js services is built into a Docker image and pushed to GCP Artifact Registry.

### 5. Deploy to Cloud Run — in order
Services must be deployed in the order below. Backends must be live before their dependent frontends, so their URLs are known when configuring the next service. After each deployment, Cloud Run assigns a unique URL — record it, as it will be needed for the services that follow.

| Order | Service | Depends On | Notes |
|-------|---------|------------|-------|
| 1 | Base | — | Core auth service. All other services link back to this URL for login redirects. Deploy first. |
| 2 | Skin & Hair Analysis | Base | Standalone. No other service depends on it. |
| 3 | Nutrition Wellness | Base | Standalone. No other service depends on it. |
| 4 | Nutrition Yelp Backend | — | API-only service. Must be live before the restaurant frontend. |
| 5 | Nutrition Yelp Frontend | Base, Nutrition Yelp Backend | Needs the backend URL injected before deployment. |
| 6 | Community Backend | — | API-only service. Must be live before the community frontend. |
| 7 | Community Frontend | Base, Community Backend | Needs the backend URL injected before deployment. |
| 8 | Fitness Dashboard | Base | Standalone. No other service depends on it. |

### 6. Wire Services Together
Once all 8 services are deployed and their URLs are known, the base service is updated with the production URLs for each service so that navigation links across the platform work correctly. Frontend services that rely on a backend (Restaurants, Community) are also updated with their respective backend URLs.

### 7. Verify End-to-End
Register a test account, navigate through every service, and confirm authentication flows and AI features work as expected.

---

## Key Considerations

**Deployment order is critical**
Backend services must be deployed before the frontends that depend on them. Skipping this order means environment variables won't be available when they're needed.

**Authentication across services**
All 8 services share a single JWT secret. When a user logs in at the base service, a secure cookie is issued. Every other service reads and verifies this same cookie. The JWT secret must be byte-for-byte identical across all services.

**Service URLs are baked in at build time**
Next.js public environment variables (like service URLs) are embedded into the app during the Docker build. If a URL changes after deployment, the affected service image must be rebuilt and redeployed.

**Secrets never in code**
All credentials are injected at runtime via GCP Secret Manager. No `.env` files should ever be committed to the repository.

---

## Post-Deployment Checklist

- [ ] All 8 Cloud Run services show a healthy status
- [ ] MongoDB Atlas accepts connections from GCP
- [ ] Database credentials have been rotated
- [ ] Navigation links between services work correctly
- [ ] User login and authentication works across services
- [ ] Skin/hair analysis returns AI results
- [ ] Meal plan generation works
- [ ] Restaurant search returns results
- [ ] Fitness dashboard loads session history
- [ ] Logout clears authentication across all services

---

