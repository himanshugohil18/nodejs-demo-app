# nodejs-demo-app — Jenkins CI/CD Pipeline

A production-ready Node.js Express application with a complete Jenkins CI/CD pipeline using Docker.

Built as **DevOps Internship Task 2** — demonstrates an automated Jenkins pipeline that builds, tests, and deploys an application using Docker.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture and Workflow](#architecture-and-workflow)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Jenkins Installation and Setup](#jenkins-installation-and-setup)
- [Required Jenkins Plugins](#required-jenkins-plugins)
- [Docker Configuration for Jenkins](#docker-configuration-for-jenkins)
- [Pipeline Configuration in Jenkins](#pipeline-configuration-in-jenkins)
- [GitHub Webhook Configuration](#github-webhook-configuration)
- [How to Execute the Pipeline](#how-to-execute-the-pipeline)
- [Pipeline Stages Explained](#pipeline-stages-explained)
- [Environment Variables](#environment-variables)
- [Running the Application Locally](#running-the-application-locally)
- [Running Tests Locally](#running-tests-locally)
- [Docker Commands Reference](#docker-commands-reference)
- [Screenshots Checklist](#screenshots-checklist)
- [Troubleshooting Common Errors](#troubleshooting-common-errors)
- [Git Commands for Repository Submission](#git-commands-for-repository-submission)
- [License](#license)

---

## Project Overview

`nodejs-demo-app` is a lightweight HTTP API built with Express.js. It exposes two endpoints:

| Endpoint  | Method | Description                                       |
|-----------|--------|---------------------------------------------------|
| `/`       | GET    | Returns application name, version, and metadata   |
| `/health` | GET    | Returns process health: uptime, memory, hostname  |

The project includes:
- 14 automated Jest/Supertest tests
- A multi-stage, non-root Docker image based on `node:20-alpine`
- A five-stage Jenkins CI/CD pipeline (Checkout → Build → Test → Deploy → Verify)

---

## Architecture and Workflow

```
 Developer pushes to GitHub (main branch)
         │
         ▼
 ┌──────────────────────────────────────────────────┐
 │            GitHub Webhook                        │
 │  Triggers Jenkins build on every push to main    │
 └──────────────────────────────────────────────────┘
         │
         ▼
 ┌──────────────────────────────────────────────────┐
 │            Jenkins Pipeline                      │
 │                                                  │
 │  Stage 1: Checkout                               │
 │  ┌──────────────────────────────────────────┐    │
 │  │  Pull source code from GitHub repository  │    │
 │  └──────────────────────────────────────────┘    │
 │                    │                             │
 │  Stage 2: Build                                  │
 │  ┌──────────────────────────────────────────┐    │
 │  │  docker build -t nodejs-demo-app:N .     │    │
 │  │  (multi-stage Dockerfile, non-root)      │    │
 │  └──────────────────────────────────────────┘    │
 │                    │                             │
 │  Stage 3: Test                                   │
 │  ┌──────────────────────────────────────────┐    │
 │  │  Run 14 Jest tests inside Docker          │    │
 │  │  (node:20-alpine with full deps)          │    │
 │  └──────────────────────────────────────────┘    │
 │                    │                             │
 │  Stage 4: Deploy                                 │
 │  ┌──────────────────────────────────────────┐    │
 │  │  Stop old container → Run new container   │    │
 │  │  docker run -d -p 3001:3000 ...            │    │
 │  └──────────────────────────────────────────┘    │
 │                    │                             │
 │  Stage 5: Verify                                 │
 │  ┌──────────────────────────────────────────┐    │
 │  │  curl / → HTTP 200                        │    │
 │  │  curl /health → HTTP 200                  │    │
 │  │  Check container is running               │    │
 │  └──────────────────────────────────────────┘    │
 └──────────────────────────────────────────────────┘
         │
         ▼
  Application accessible at http://localhost:3001/
```

**Key design decisions:**
- Pipeline uses `sh 'docker ...'` commands (no Docker pipeline plugin required)
- Tests run inside a fresh `node:20-alpine` container with all dependencies installed
- The production Docker image contains only production dependencies (smaller, more secure)
- Deploy replaces the old container — zero-downtime for the next run
- All configurable values are environment variables — no hardcoded ports or names
- Credentials are managed by Jenkins — never committed to the repository

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
| Init process      | dumb-init                          |
| CI/CD server      | Jenkins 2.528.3                   |
| Containerization  | Docker 28.1.1                     |
| Version control   | Git / GitHub                      |

---

## Project Structure

```
nodejs-demo-app/
├── src/
│   └── app.js                # Express application (all endpoints)
├── tests/
│   └── app.test.js           # Jest + Supertest tests (14 tests)
├── .github/
│   └── workflows/
│       └── main.yml          # GitHub Actions CI/CD pipeline (Task 1)
├── .dockerignore             # Files excluded from Docker build context
├── .env.example              # Environment variable template
├── .gitignore                # Git ignore rules
├── Dockerfile                # Multi-stage production Docker image
├── Jenkinsfile               # Jenkins CI/CD pipeline (Task 2)
├── package.json              # Project manifest and npm scripts
├── package-lock.json         # Locked dependency versions
└── README.md                 # This file
```

---

## Prerequisites

### On the Jenkins Server

| Requirement        | Version    | Purpose                          |
|--------------------|------------|----------------------------------|
| Java (JDK)         | 17 or 21   | Required by Jenkins              |
| Jenkins            | 2.x        | CI/CD server                     |
| Docker             | 20+        | Container builds and deployments |
| Git                | 2.x        | Source code checkout             |
| curl               | any        | Endpoint verification            |
| jq                 | 1.6+       | JSON output formatting (optional)|
| Internet access    | —          | Pull node:20-alpine image        |

### On Your Local Machine (for development)

| Requirement  | Version    |
|--------------|------------|
| Node.js      | >= 18 (20 LTS recommended) |
| npm          | >= 9       |
| Docker       | 20+        |
| Git          | 2.x        |

---

## Jenkins Installation and Setup

### Option A: Install Jenkins on Ubuntu/Debian

```bash
# 1. Install Java (Jenkins requires Java 17 or 21)
sudo apt update
sudo apt install -y openjdk-21-jre-headless

# 2. Add the Jenkins repository key
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/" | \
  sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

# 3. Install Jenkins
sudo apt update
sudo apt install -y jenkins

# 4. Start and enable Jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins

# 5. Verify Jenkins is running
sudo systemctl status jenkins
```

### Option B: Run Jenkins in Docker

```bash
docker run -d \
  --name jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(which docker):/usr/bin/docker \
  --group-add $(getent group docker | cut -d: -f3) \
  jenkins/jenkins:lts
```

> **Note:** Running Jenkins in Docker with access to the host Docker socket allows the
> pipeline to build and run Docker containers on the host. This is convenient for
> development but has security implications for production environments.

### Initial Jenkins Setup

1. Open a browser and navigate to `http://localhost:8080`
2. Retrieve the initial admin password:
   ```bash
   sudo cat /var/lib/jenkins/secrets/initialAdminPassword
   ```
   (If running in Docker: `docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword`)
3. Paste the password to unlock Jenkins
4. Click **Install suggested plugins** (this installs Git, Pipeline, and other essentials)
5. Create your first admin user
6. Click **Save and Finish** → **Start using Jenkins**

---

## Required Jenkins Plugins

The following plugins are required. Most are installed by default with the
"Install suggested plugins" option during initial setup.

| Plugin                    | Purpose                                      | Pre-installed? |
|---------------------------|----------------------------------------------|----------------|
| Pipeline                  | Declarative pipeline execution               | ✅ Yes          |
| Git                       | Source code checkout from GitHub             | ✅ Yes          |
| GitHub                    | GitHub integration                           | ✅ Yes          |
| Credentials Binding       | Secure credential handling                   | ✅ Yes          |
| Workspace Cleanup         | Clean workspace between builds                | ✅ Yes          |
| Timestamper               | Timestamps in build logs                     | ✅ Yes          |
| Docker Pipeline (optional)| Docker DSL commands in pipeline              | ❌ Not required  |

> **Important:** This pipeline uses `sh 'docker ...'` shell commands instead of
> the Docker Pipeline plugin. This means you do **not** need to install the
> Docker Pipeline plugin. The pipeline just needs the `docker` CLI available
> on the Jenkins agent and the Jenkins user to have Docker permissions.

### Verifying Installed Plugins

1. Go to **Manage Jenkins** → **Plugins** → **Installed plugins**
2. Search for "Pipeline" and "Git" to confirm they are installed

### Installing Missing Plugins (if needed)

1. Go to **Manage Jenkins** → **Plugins** → **Available plugins**
2. Search for the plugin name
3. Check the box and click **Install**
4. Restart Jenkins if prompted

---

## Docker Configuration for Jenkins

The Jenkins user must have permission to run Docker commands. By default, only
users in the `docker` group can communicate with the Docker daemon.

### Step 1: Add Jenkins user to the docker group

```bash
# Add jenkins to the docker group
sudo usermod -aG docker jenkins

# Verify the group was added
groups jenkins
# Expected output: jenkins : jenkins docker

# Restart Jenkins for the group change to take effect
sudo systemctl restart jenkins
```

> **If Jenkins is running in Docker**, mount the Docker socket and add the group:
> ```bash
> docker run -d \
>   --name jenkins \
>   -p 8080:8080 \
>   -v jenkins_home:/var/jenkins_home \
>   -v /var/run/docker.sock:/var/run/docker.sock \
>   -v $(which docker):/usr/bin/docker \
>   --group-add $(getent group docker | cut -d: -f3) \
>   jenkins/jenkins:lts
> ```

### Step 2: Verify Docker access from Jenkins

```bash
# Test that the jenkins user can run docker
sudo -u jenkins docker ps
# If you see the container list, Docker is configured correctly
```

### Step 3: Verify port 3001 is available

The pipeline deploys the app on host port 3001 (to avoid conflicts with other
services). Make sure nothing is already using this port:

```bash
sudo netstat -tlnp | grep 3001
# If nothing shows, the port is free
```

---

## Pipeline Configuration in Jenkins

### Step 1: Create a new Pipeline job

1. Go to the Jenkins dashboard: `http://localhost:8080`
2. Click **New Item**
3. Enter a name: `nodejs-demo-app-cicd`
4. Select **Pipeline**
5. Click **OK**

### Step 2: Configure the pipeline

In the job configuration page:

1. Under **General**:
   - Check **Discard old builds** → Days to keep builds: `10`
   - Optional: Check **GitHub project** and enter the repo URL

2. Under **Build Triggers**:
   - Check **GitHub hook trigger for GITScm polling**
   - This enables automatic builds when GitHub sends a webhook

3. Under **Pipeline**:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/himanshugohil18/nodejs-demo-app.git`
   - Branches to build: `*/main`
   - Script path: `Jenkinsfile`
   - Lightweight checkout: Uncheck (ensures full workspace is available)

4. Click **Save**

### Step 3: Run the pipeline manually

1. On the job page, click **Build Now**
2. Click the build number in the build history
3. Click **Console Output** to see the pipeline in action

---

## GitHub Webhook Configuration

The webhook allows Jenkins to automatically trigger a build every time code is
pushed to the GitHub repository.

### Prerequisites

- Jenkins must be accessible from the internet (for GitHub to send webhooks)
- If Jenkins is on your local machine, use a tool like [ngrok](https://ngrok.com)
  to expose it temporarily

### Step 1: Get your Jenkins webhook URL

Your webhook URL follows this pattern:

```
http://<jenkins-host>:8080/github-webhook/
```

For local Jenkins: `http://localhost:8080/github-webhook/`
For ngrok: `http://<ngrok-url>.ngrok.io/github-webhook/`

### Step 2: Add the webhook in GitHub

1. Go to your GitHub repository: `https://github.com/himanshugohil18/nodejs-demo-app`
2. Click **Settings** → **Webhooks** → **Add webhook**
3. Configure the webhook:

| Field             | Value                                        |
|-------------------|----------------------------------------------|
| Payload URL       | `http://<jenkins-host>:8080/github-webhook/` |
| Content type      | `application/x-www-form-urlencoded`          |
| Which events      | Just the `push` event                         |
| Active            | ✅ Checked                                    |

4. Click **Add webhook**

### Step 3: Verify the webhook

1. After adding, GitHub will send a ping — check the **Recent Deliveries** section
2. You should see a green checkmark next to the ping
3. If you see a red X, check:
   - Jenkins is running and accessible
   - The URL is correct
   - The Jenkins GitHub plugin is installed

### Step 4: Test the webhook

```bash
# Make a small change and push to main
git clone https://github.com/himanshugohil18/nodejs-demo-app.git
cd nodejs-demo-app
echo "# Jenkins CI/CD" >> README.md
git add README.md
git commit -m "test: trigger Jenkins webhook"
git push origin main
```

Jenkins should automatically start a new build within a few seconds.

### Using ngrok for Local Jenkins (Optional)

If Jenkins is running locally and not accessible from the internet:

```bash
# Install ngrok (if not already installed)
# Download from https://ngrok.com/download

# Expose Jenkins port
ngrok http 8080

# You will see output like:
# Forwarding  https://abc123.ngrok.io -> http://localhost:8080

# Use this URL in the GitHub webhook configuration:
# https://abc123.ngrok.io/github-webhook/
```

---

## How to Execute the Pipeline

### Manual Trigger

1. Go to Jenkins dashboard
2. Click on your pipeline job (`nodejs-demo-app-cicd`)
3. Click **Build Now**
4. Click the build number → **Console Output** to watch the pipeline

### Automatic Trigger (GitHub Webhook)

Simply push code to the `main` branch of the GitHub repository. Jenkins will
automatically detect the push and start a new build.

### Checking Build Results

1. On the job page, the build history shows recent builds
2. Green checkmark ✅ = success, red X ❌ = failure
3. Click any build → **Console Output** for detailed logs
4. The **Pipeline Overview** view shows each stage visually

### Accessing the Deployed Application

After a successful build:

```bash
# Root endpoint
curl http://localhost:3001/

# Health endpoint
curl http://localhost:3001/health

# Or open in a browser
# http://localhost:3001/
# http://localhost:3001/health
```

---

## Pipeline Stages Explained

### Stage 1: Checkout

```groovy
stage('Checkout') {
    steps {
        checkout scm
    }
}
```

- Uses `checkout scm` to pull source code from the Git repository configured in
  the Jenkins job
- The repository URL, branch, and credentials are managed by Jenkins — never
  hardcoded in the Jenkinsfile
- Prints the branch name and commit hash for traceability

### Stage 2: Build

```groovy
stage('Build') {
    steps {
        sh 'docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .'
    }
}
```

- Builds the production Docker image using the existing multi-stage Dockerfile
- The Dockerfile creates a `node:20-alpine` based image with:
  - Production dependencies only (`npm ci --omit=dev`)
  - Non-root user (`appuser`) for security
  - `dumb-init` for proper signal handling
  - Docker healthcheck on `/health` endpoint
- Image is tagged with the Jenkins build number (e.g., `nodejs-demo-app:42`)

### Stage 3: Test

```groovy
stage('Test') {
    steps {
        sh 'docker run --rm -v "$WORKSPACE:/app" -w /app node:20-alpine sh -c "npm ci && npm test"'
    }
}
```

- Runs the 14 Jest/Supertest tests inside a fresh `node:20-alpine` container
- The workspace is mounted as a volume, so the container has access to the source
  code and `package.json`
- Installs all dependencies (including dev dependencies: `jest`, `supertest`)
- Runs `npm test` which executes all tests in the `tests/` directory
- If any test fails, the stage fails and the pipeline stops
- `--rm` flag removes the test container automatically after it exits

### Stage 4: Deploy

```groovy
stage('Deploy') {
    steps {
        sh 'docker stop ${CONTAINER_NAME} 2>/dev/null || true'
        sh 'docker rm ${CONTAINER_NAME} 2>/dev/null || true'
        sh 'docker run -d --name ${CONTAINER_NAME} -p ${HOST_PORT}:${CONTAINER_PORT} ...'
    }
}
```

- Stops and removes any previous container with the same name
- Starts a new container from the freshly built image
- Maps host port 3001 to container port 3000
- Uses `--restart unless-stopped` so the container survives host reboots
- Runs in detached mode (`-d`) so it stays running in the background

### Stage 5: Verify

```groovy
stage('Verify') {
    steps {
        // Check container is running
        // curl / endpoint → expect HTTP 200
        // curl /health endpoint → expect HTTP 200
        // Display container logs
    }
}
```

- Waits 5 seconds for the container to start
- Verifies the container is in `running` state using `docker ps`
- Sends an HTTP GET to the `/` endpoint and checks for HTTP 200
- Sends an HTTP GET to the `/health` endpoint and checks for HTTP 200
- Displays the JSON response from both endpoints
- Shows container logs for debugging
- If any check fails, the stage fails, the pipeline stops, and container logs
  are displayed for troubleshooting

### Post Actions

```groovy
post {
    success { echo "PIPELINE SUCCEEDED ..." }
    failure { echo "PIPELINE FAILED ..."; sh 'docker logs ${CONTAINER_NAME}' }
    always  { sh 'docker run --rm ... rm -rf node_modules'; echo "Cleanup complete." }
}
```

- **success**: Prints a summary with image name, container name, and URLs
- **failure**: Prints failure message and shows container logs
- **always**: Cleans up `node_modules` created by the test container (owned by
  root, so it uses a Docker container to remove them)

---

## Environment Variables

All configurable values are defined as environment variables in the Jenkinsfile.
You can override any of these in the Jenkins job configuration.

| Variable         | Default                  | Description                        |
|------------------|--------------------------|------------------------------------|
| `IMAGE_NAME`     | `nodejs-demo-app`        | Docker image name                  |
| `IMAGE_TAG`      | `${env.BUILD_NUMBER}`    | Docker image tag (Jenkins build #) |
| `CONTAINER_NAME` | `nodejs-demo-app-jenkins`| Docker container name              |
| `HOST_PORT`      | `3001`                   | Host port for the app              |
| `CONTAINER_PORT` | `3000`                   | Port inside the container          |

### Overriding Environment Variables

In the Jenkins job configuration:

1. Go to the job → **Configure**
2. Under **Pipeline**, check **This project is parameterized**
3. Add **String Parameter** for each variable you want to override

Or use the **Environment Variables** section in the job configuration.

---

## Running the Application Locally

```bash
# 1. Clone the repository
git clone https://github.com/himanshugohil18/nodejs-demo-app.git
cd nodejs-demo-app

# 2. Copy environment template
cp .env.example .env

# 3. Install dependencies
npm ci

# 4. Start the server (default port: 3000)
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

---

## Running Tests Locally

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

## Docker Commands Reference

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

### Test the running container

```bash
curl http://localhost:3000/
curl http://localhost:3000/health
```

### Check container health status

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

---

## Screenshots Checklist

Capture the following screenshots for your internship submission:

| #  | Screenshot Description                                      | How to Capture                                         |
|----|-------------------------------------------------------------|--------------------------------------------------------|
| 1  | Jenkins dashboard with the pipeline job listed              | Go to `http://localhost:8080/`                         |
| 2  | Pipeline job configuration (SCM settings)                   | Job → Configure → Pipeline section                     |
| 3  | GitHub webhook configuration page                           | GitHub repo → Settings → Webhooks                       |
| 4  | Build triggered (running pipeline)                           | Job page → Build in progress                           |
| 5  | Pipeline stage view (all 5 stages visible)                  | Job → Build #N → Pipeline Overview / Stage View        |
| 6  | Checkout stage console output                                | Build → Console Output → Checkout stage                |
| 7  | Build stage console output (Docker build)                    | Build → Console Output → Build stage                    |
| 8  | Test stage console output (all 14 tests passing)            | Build → Console Output → Test stage                    |
| 9  | Deploy stage console output (docker run)                     | Build → Console Output → Deploy stage                  |
| 10 | Verify stage console output (HTTP 200 responses)             | Build → Console Output → Verify stage                 |
| 11 | Pipeline success (green checkmark)                           | Job page → build history                               |
| 12 | Application accessible in browser (http://localhost:3001/)   | Open `http://localhost:3001/` in browser               |
| 13 | Health endpoint response (http://localhost:3001/health)     | Open `http://localhost:3001/health` in browser         |
| 14 | Docker container running (docker ps output)                 | Run `docker ps` in terminal                            |
| 15 | GitHub webhook delivery success (green checkmark)            | GitHub repo → Settings → Webhooks → Recent Deliveries  |
| 16 | Jenkinsfile in GitHub repository                             | GitHub repo → Jenkinsfile                               |

---

## Troubleshooting Common Errors

### 1. "permission denied while trying to connect to the Docker daemon socket"

**Cause:** The Jenkins user is not in the `docker` group.

**Fix:**
```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
# Verify:
groups jenkins
# Should show: jenkins : jenkins docker
```

### 2. "Cannot connect to the Docker daemon. Is the docker daemon running?"

**Cause:** Docker service is not running.

**Fix:**
```bash
sudo systemctl start docker
sudo systemctl enable docker
# Verify:
sudo systemctl status docker
```

### 3. "Port 3001 is already in use"

**Cause:** Another process is using port 3001.

**Fix:**
```bash
# Find what's using the port
sudo lsof -i :3001
# Or
sudo netstat -tlnp | grep 3001

# Either stop the process or change the HOST_PORT in the Jenkinsfile
# environment { HOST_PORT = '3002' }
```

### 4. "docker run: conflict — container name already in use"

**Cause:** A previous container with the same name was not removed.

**Fix:**
```bash
# Remove the old container manually
docker stop nodejs-demo-app-jenkins
docker rm nodejs-demo-app-jenkins
# Then rebuild
```

### 5. "npm: command not found" in Test stage

**Cause:** The `node:20-alpine` image was not pulled, or Docker is not accessible.

**Fix:**
```bash
# Pull the image manually
docker pull node:20-alpine
# Verify Docker access from Jenkins
sudo -u jenkins docker ps
```

### 6. "curl: (7) Failed to connect to localhost port 3001"

**Cause:** The container did not start or the app crashed.

**Fix:**
```bash
# Check if the container is running
docker ps -a | grep nodejs-demo-app
# View container logs
docker logs nodejs-demo-app-jenkins
# If it exited immediately, check for port conflicts or app errors
```

### 7. Jenkins build fails at Checkout stage

**Cause:** Incorrect repository URL or credentials.

**Fix:**
1. Go to Job → Configure → Pipeline
2. Verify the Repository URL is correct: `https://github.com/himanshugohil18/nodejs-demo-app.git`
3. If the repo is private, add credentials:
   - Go to **Manage Jenkins** → **Credentials** → **System** → **Global credentials**
   - Add a **Username with password** credential (GitHub username + personal access token)
   - In the Pipeline config, select the credential from the dropdown

### 8. GitHub webhook not triggering Jenkins builds

**Cause:** Jenkins is not reachable from GitHub, or the webhook URL is incorrect.

**Fix:**
1. Verify Jenkins is accessible from the internet (use ngrok if local)
2. Check the webhook URL in GitHub: `http://<jenkins-host>:8080/github-webhook/`
3. In the Jenkins job config, ensure **GitHub hook trigger for GITScm polling** is checked
4. Check GitHub → Settings → Webhooks → Recent Deliveries for error messages
5. Ensure the GitHub plugin is installed in Jenkins

### 9. "No such image" error in Deploy stage

**Cause:** The Build stage failed but the pipeline continued (shouldn't happen with declarative pipeline).

**Fix:**
```bash
# List available images
docker images | grep nodejs-demo-app
# If the image doesn't exist, rebuild
docker build -t nodejs-demo-app:latest .
```

### 10. Tests pass locally but fail in Jenkins

**Cause:** Different Node.js version or missing dependencies in the Jenkins environment.

**Fix:**
```bash
# Check the Node.js version in the test container
docker run --rm node:20-alpine node --version
# Should show v20.x.x
# The test container installs dependencies fresh from package-lock.json
# Make sure package-lock.json is committed to the repo
```

### 11. "npm ci" fails with "package-lock.json not found"

**Cause:** The lock file is not committed to the repository.

**Fix:**
```bash
git add package-lock.json
git commit -m "fix: add package-lock.json"
git push origin main
```

### 12. node_modules owned by root after test stage

**Cause:** The Docker test container runs as root, creating `node_modules` owned by root.

**Fix:** The Jenkinsfile includes a post-always cleanup step that removes `node_modules` using a Docker container. If you still have issues:
```bash
sudo rm -rf node_modules
```

---

## Git Commands for Repository Submission

The assignment requires a separate GitHub repository. Follow these steps to
create and push the repository.

### Step 1: Create a new repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `jenkins-cicd-nodejs-app` (or your preferred name)
3. Set to **Public**
4. Do NOT initialize with README, .gitignore, or license (the project already has these)
5. Click **Create repository**

### Step 2: Prepare and push the project

```bash
# Navigate to the project directory
cd ~/nodejs-demo-app

# Check current git status
git status

# Stage the new files
git add Jenkinsfile README.md

# Verify what will be committed
git status

# Commit the changes
git commit -m "feat: add Jenkins CI/CD pipeline with Docker

- Add Jenkinsfile with 5 stages: Checkout, Build, Test, Deploy, Verify
- Update README.md with full Jenkins CI/CD documentation
- Pipeline builds Docker image, runs 14 Jest tests, deploys container, verifies endpoints
- Uses environment variables for all configurable values
- Includes GitHub webhook setup instructions and troubleshooting guide"

# If pushing to the EXISTING repository:
git push origin main

# OR if creating a NEW separate repository:
# Add the new remote (replace URL with your new repo)
git remote add jenkins-repo https://github.com/himanshugohil18/jenkins-cicd-nodejs-app.git

# Push to the new repository
git push jenkins-repo main
```

### Step 3: Verify on GitHub

1. Go to your repository on GitHub
2. Verify the Jenkinsfile is visible
3. Verify the README.md is displayed on the repo home page
4. Check that no secrets or sensitive files are committed

---

## License

MIT — see [LICENSE](LICENSE) for details.
