# nodejs-demo-app

A production-ready Node.js Express application with a complete automated CI/CD pipeline using GitHub Actions and Docker Hub.

Built as **DevOps Internship Task 1** to demonstrate end-to-end automation: automated testing, Docker containerisation, and continuous deployment.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture and CI/CD Workflow](#architecture-and-cicd-workflow)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Local Installation](#local-installation)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [Docker](#docker)
- [GitHub Actions Pipeline](#github-actions-pipeline)
- [Docker Hub Configuration](#docker-hub-configuration)
- [Required GitHub Secrets](#required-github-secrets)
- [Verification](#verification)

---

## Project Overview

`nodejs-demo-app` is a lightweight HTTP API built with Express.js. It exposes two endpoints:

| Endpoint  | Method | Description                                       |
|-----------|--------|---------------------------------------------------|
| `/`       | GET    | Returns application name, version, and metadata   |
| `/health` | GET    | Returns process health: uptime, memory, hostname  |

The project includes:
- 12 automated Jest/Supertest tests
- A multi-stage, non-root Docker image based on `node:20-alpine`
- A three-stage GitHub Actions CI/CD pipeline (test → build → push)

---

## Architecture and CI/CD Workflow

```
Developer pushes to main
         │
         ▼
┌─────────────────────────────────────────────┐
│         GitHub Actions Pipeline             │
│                                             │
│  Stage 1: Test                              │
│  ┌──────────────────────────────────────┐   │
│  │  Checkout → Setup Node.js 20 →       │   │
│  │  npm ci → npm test (Jest)            │   │
│  └──────────────────────────────────────┘   │
│                    │ (pass)                  │
│  Stage 2: Build                             │
│  ┌──────────────────────────────────────┐   │
│  │  Checkout → Docker Buildx →          │   │
│  │  docker build (validation)           │   │
│  └──────────────────────────────────────┘   │
│                    │ (pass)                  │
│  Stage 3: Push (main branch only)           │
│  ┌──────────────────────────────────────┐   │
│  │  Docker login → Build & push         │   │
│  │  Tags: latest + git SHA              │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │
         ▼
  Docker Hub: your-username/nodejs-demo-app
```

**Key design decisions:**
- Tests must pass before the Docker image is built
- Docker push only happens on `push` to `main` — never on pull requests
- Two image tags are published: `latest` and the full git commit SHA for traceability
- Credentials are stored exclusively as GitHub Secrets, never hardcoded

---

## Technology Stack

| Category          | Technology                        |
|-------------------|-----------------------------------|
| Runtime           | Node.js 20 (LTS)                  |
| Web framework     | Express 4                         |
| Environment vars  | dotenv                            |
| Test framework    | Jest 29                           |
| HTTP test client  | Supertest 7                       |
| Container base    | node:20-alpine                    |
| Init process      | dumb-init                         |
| CI/CD             | GitHub Actions                    |
| Container registry| Docker Hub                        |

---

## Project Structure

```
nodejs-demo-app/
├── .github/
│   └── workflows/
│       └── main.yml          # GitHub Actions CI/CD pipeline
├── src/
│   └── app.js                # Express application (all endpoints)
├── tests/
│   └── app.test.js           # Jest + Supertest tests (12 tests)
├── .dockerignore             # Files excluded from Docker build context
├── .env.example              # Environment variable template
├── .gitignore                # Git ignore rules
├── Dockerfile                # Multi-stage production Docker image
├── package.json              # Project manifest and npm scripts
└── README.md                 # This file
```

---

## Local Installation

### Prerequisites

- Node.js >= 18 (recommended: 20 LTS via [nvm](https://github.com/nvm-sh/nvm))
- npm >= 9
- Docker (for container steps)
- Git

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/nodejs-demo-app.git
cd nodejs-demo-app

# 2. Copy environment template
cp .env.example .env

# 3. Install dependencies
npm ci
```

---

## Running the Application

```bash
# Start the server (default port: 3000)
npm start

# The application is available at:
#   http://localhost:3000/
#   http://localhost:3000/health
```

Expected output:
```
✅  nodejs-demo-app running on port 3000 [development]
   Root:   http://localhost:3000/
   Health: http://localhost:3000/health
```

Test the endpoints with curl:
```bash
curl http://localhost:3000/
curl http://localhost:3000/health
```

---

## Running Tests

```bash
# Run tests once
npm test

# Run tests with coverage report
npm run test:coverage
```

Expected output:
```
 PASS  tests/app.test.js
  GET /
    ✓ should return 200 with application info
    ✓ should include version in the response
    ✓ should include environment in the response
    ✓ should include timestamp in the response
    ✓ should return JSON content-type
  GET /health
    ✓ should return 200 with status ok
    ✓ should include uptime in the response
    ✓ should include hostname in the response
    ✓ should include memory stats in the response
    ✓ should include nodeVersion in the response
    ✓ should return JSON content-type
  404 handler
    ✓ should return 404 for unknown routes
    ✓ should return 404 for unknown POST routes
    ✓ should include message and timestamp in 404 response

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
```

---

## Docker

### Build the image

```bash
docker build -t nodejs-demo-app:latest .
```

### Run the container

```bash
docker run -d \
  --name nodejs-demo-app \
  -p 3000:3000 \
  --restart unless-stopped \
  nodejs-demo-app:latest
```

### Test endpoints in the running container

```bash
curl http://localhost:3000/
curl http://localhost:3000/health
```

### Check Docker health status

```bash
docker inspect --format='{{.State.Health.Status}}' nodejs-demo-app
```

### View logs

```bash
docker logs nodejs-demo-app
docker logs -f nodejs-demo-app   # Follow log output
```

### Stop and remove the container

```bash
docker stop nodejs-demo-app
docker rm nodejs-demo-app
```

### Run from Docker Hub

```bash
docker pull <your-username>/nodejs-demo-app:latest
docker run -d -p 3000:3000 <your-username>/nodejs-demo-app:latest
```

---

## GitHub Actions Pipeline

The pipeline is defined in `.github/workflows/main.yml` and runs on every push or pull request targeting `main`.

### Stage 1 — Test

```
actions/checkout@v4
actions/setup-node@v4  (Node.js 20, npm cache)
npm ci
npm test
```

Runs all 14 Jest tests. The pipeline aborts if any test fails.

### Stage 2 — Build

```
actions/checkout@v4
docker/setup-buildx-action@v3
docker/build-push-action@v5   (push: false — build validation only)
```

Builds the Docker image with GHA cache. Does not push the image. Runs on every trigger (including PRs).

### Stage 3 — Push

```
actions/checkout@v4
docker/setup-buildx-action@v3
docker/login-action@v3         (authenticates with Docker Hub)
docker/metadata-action@v5      (extracts labels)
docker/build-push-action@v5   (push: true)
```

Only runs when a commit is pushed directly to `main`. Publishes two tags:
- `<username>/nodejs-demo-app:latest`
- `<username>/nodejs-demo-app:<full-commit-sha>`

---

## Docker Hub Configuration

1. Create a free account at [hub.docker.com](https://hub.docker.com)
2. Create a new repository: `nodejs-demo-app` (set visibility to Public)
3. Generate an access token:
   - Go to **Account Settings → Security → New Access Token**
   - Name it `github-actions`
   - Permission: **Read, Write, Delete**
   - Copy the token immediately — it won't be shown again

---

## Required GitHub Secrets

Go to your repository → **Settings → Secrets and variables → Actions → New repository secret**.

| Secret Name          | Value                                    |
|----------------------|------------------------------------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username                 |
| `DOCKERHUB_TOKEN`    | The access token generated above         |

> **Never** commit credentials to the repository. The workflow references these secrets as `${{ secrets.DOCKERHUB_USERNAME }}` — GitHub masks them in all log output.

---

## Verification

### Verify tests pass

```bash
npm test
# All tests should show ✓ (pass)
```

### Verify Docker build

```bash
docker build -t nodejs-demo-app:test .
docker run --rm -p 3000:3000 nodejs-demo-app:test &
sleep 3
curl -s http://localhost:3000/ | jq .
curl -s http://localhost:3000/health | jq .
```

### Verify pipeline (after pushing to GitHub)

1. Navigate to your repository on GitHub
2. Click the **Actions** tab
3. Select the latest workflow run
4. Confirm all three stages (Test, Build, Push) show a green checkmark ✅

### Verify Docker Hub image

```bash
docker pull <your-username>/nodejs-demo-app:latest
docker run --rm -p 3001:3000 <your-username>/nodejs-demo-app:latest &
curl http://localhost:3001/health
```

---

## License

MIT — see [LICENSE](LICENSE) for details.
