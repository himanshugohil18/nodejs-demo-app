// ──────────────────────────────────────────────────────────────────────────────
// Jenkins CI/CD Pipeline for nodejs-demo-app
//
// Stages:  Checkout → Build → Test → Deploy → Verify
//
// Prerequisites:
//   1. Jenkins user must be in the docker group:
//        sudo usermod -aG docker jenkins && sudo systemctl restart jenkins
//   2. Create a Pipeline job in Jenkins configured with:
//        - Pipeline script from SCM
//        - Repository URL: https://github.com/himanshugohil18/nodejs-demo-app.git
//        - Branch: */main
//        - Script path: Jenkinsfile
//
// All configurable values are defined as environment variables below.
// No credentials are hardcoded — use Jenkins Credentials store for secrets.
// ──────────────────────────────────────────────────────────────────────────────

pipeline {
    agent any

    // ── Configurable environment variables ──────────────────────────────────
    // Override any of these in the Jenkins job configuration → Environment
    // section, or via the "This project is parameterized" option.
    environment {
        IMAGE_NAME     = 'nodejs-demo-app'          // Docker image name
        IMAGE_TAG      = "${env.BUILD_NUMBER}"       // Tag = Jenkins build number
        CONTAINER_NAME = 'nodejs-demo-app-jenkins'   // Docker container name
        HOST_PORT      = '3001'                       // Host port (3001 avoids conflicts)
        CONTAINER_PORT = '3000'                      // Port inside the container
    }

    // ── Pipeline options ─────────────────────────────────────────────────────
    options {
        timeout(time: 10, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }

    stages {

        // ── Stage 1: Checkout ─────────────────────────────────────────────────
        // Pulls source code from the Git repository configured in the Jenkins
        // job.  Uses `checkout scm` so the repo URL, branch, and credentials
        // are managed by Jenkins — never hardcoded in this file.
        stage('Checkout') {
            steps {
                checkout scm
                echo "Branch: ${env.GIT_BRANCH ?: 'N/A'}"
                echo "Commit: ${env.GIT_COMMIT ?: 'N/A'}"
            }
        }

        // ── Stage 2: Build ────────────────────────────────────────────────────
        // Builds the production Docker image using the existing multi-stage
        // Dockerfile (node:20-alpine, non-root, dumb-init, healthcheck).
        stage('Build') {
            steps {
                sh 'docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .'
                echo "Built image: ${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }

        // ── Stage 3: Test ─────────────────────────────────────────────────────
        // Runs the 14 Jest/Supertest tests inside a Docker container.
        //
        // The production Dockerfile installs only production dependencies
        // (npm ci --omit=dev), so test deps (jest, supertest) are not in the
        // production image.  Instead we run tests in a fresh node:20-alpine
        // container with the workspace mounted, installing ALL dependencies
        // (including dev) and running `npm test`.
        stage('Test') {
            steps {
                sh '''
                    echo "Running tests inside Docker container (node:20-alpine)..."
                    docker run --rm \
                        -v "$WORKSPACE:/app" \
                        -w /app \
                        node:20-alpine \
                        sh -c "npm ci && npm test"
                '''
            }
        }

        // ── Stage 4: Deploy ──────────────────────────────────────────────────
        // Deploys the application as a Docker container.
        // Stops and removes any previous container with the same name, then
        // starts a new one from the freshly built image.
        stage('Deploy') {
            steps {
                sh '''
                    echo "Stopping existing container (if any)..."
                    docker stop ${CONTAINER_NAME} 2>/dev/null || true
                    docker rm   ${CONTAINER_NAME} 2>/dev/null || true

                    echo "Starting new container..."
                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        -p ${HOST_PORT}:${CONTAINER_PORT} \
                        --restart unless-stopped \
                        ${IMAGE_NAME}:${IMAGE_TAG}

                    echo "Container '${CONTAINER_NAME}' started on port ${HOST_PORT}"
                '''
            }
        }

        // ── Stage 5: Verify ───────────────────────────────────────────────────
        // Confirms the deployed container is running and the application
        // endpoints are accessible.  Fails the pipeline if any check fails.
        stage('Verify') {
            steps {
                sh '''
                    echo "Waiting for container to start..."
                    sleep 5

                    # ── Check container is running ──
                    echo "=== Container Status ==="
                    if ! docker ps \
                        --filter "name=${CONTAINER_NAME}" \
                        --filter "status=running" \
                        --format "{{.Names}}" | grep -q "${CONTAINER_NAME}"; then
                        echo "ERROR: Container '${CONTAINER_NAME}' is not running!"
                        docker logs ${CONTAINER_NAME}
                        exit 1
                    fi
                    echo "Container is running."

                    # ── Check root endpoint (/) ──
                    echo ""
                    echo "=== Testing / endpoint ==="
                    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${HOST_PORT}/)
                    if [ "$HTTP_CODE" != "200" ]; then
                        echo "ERROR: / endpoint returned HTTP ${HTTP_CODE}"
                        docker logs ${CONTAINER_NAME}
                        exit 1
                    fi
                    echo "OK: / endpoint returned HTTP 200"
                    curl -s http://localhost:${HOST_PORT}/ | jq .

                    # ── Check health endpoint (/health) ──
                    echo ""
                    echo "=== Testing /health endpoint ==="
                    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${HOST_PORT}/health)
                    if [ "$HTTP_CODE" != "200" ]; then
                        echo "ERROR: /health endpoint returned HTTP ${HTTP_CODE}"
                        docker logs ${CONTAINER_NAME}
                        exit 1
                    fi
                    echo "OK: /health endpoint returned HTTP 200"
                    curl -s http://localhost:${HOST_PORT}/health | jq .

                    # ── Show container logs ──
                    echo ""
                    echo "=== Container Logs ==="
                    docker logs ${CONTAINER_NAME}
                '''
            }
        }
    }

    // ── Post actions ─────────────────────────────────────────────────────────
    // Run after all stages complete, regardless of success or failure.
    post {
        success {
            echo """
            ============================================
              PIPELINE SUCCEEDED
            ============================================
              Image:     ${IMAGE_NAME}:${IMAGE_TAG}
              Container: ${CONTAINER_NAME}
              App URL:   http://localhost:${HOST_PORT}/
              Health:    http://localhost:${HOST_PORT}/health
            ============================================
            """
        }
        failure {
            echo """
            ============================================
              PIPELINE FAILED
            ============================================
              Check the stage logs above for errors.
              Container logs (if any) are shown below.
            ============================================
            """
            sh 'docker logs ${CONTAINER_NAME} 2>/dev/null || true'
        }
        always {
            // Clean up node_modules created by root inside the test container.
            // Uses another container because the files are owned by root.
            sh 'docker run --rm -v "$WORKSPACE:/app" -w /app node:20-alpine sh -c "rm -rf node_modules" 2>/dev/null || true'
            echo "Cleanup complete."
        }
    }
}
