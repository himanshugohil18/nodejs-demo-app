'use strict';

const express = require('express');
const os = require('os');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Track application start time for uptime calculation
const startTime = Date.now();

/**
 * GET /
 * Root endpoint — returns application info
 */
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to nodejs-demo-app!',
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    author: 'Himanshu',
    description: 'Production-ready Node.js Express app with CI/CD pipeline',
  });
});

/**
 * GET /health
 * Health-check endpoint — used by Docker health checks and load balancers
 */
app.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    status: 'ok',
    uptime: uptimeSeconds,
    hostname: os.hostname(),
    pid: process.pid,
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
    },
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    timestamp: new Date().toISOString(),
  });
});

// Only start the server when this file is run directly (not required by tests)
let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`✅  nodejs-demo-app running on port ${PORT} [${NODE_ENV}]`);
    console.log(`   Root:   http://localhost:${PORT}/`);
    console.log(`   Health: http://localhost:${PORT}/health`);
  });
}

module.exports = { app, server };
