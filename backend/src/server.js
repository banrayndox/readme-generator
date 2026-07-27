import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { initializeSocket } from './socket/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

// Ensure required directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const tempDir = path.join(__dirname, '../temp');
const logsDir = path.join(__dirname, '../logs');

const createDirIfNotExist = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

createDirIfNotExist(uploadsDir);
createDirIfNotExist(tempDir);
createDirIfNotExist(logsDir);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 CodeReady AI Server running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`===============================================`);
});

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});
