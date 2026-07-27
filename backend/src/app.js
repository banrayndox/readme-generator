import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import analysisRoutes from './routes/analysis.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers
app.use(helmet());

// CORS Setup - flexible for localhost development ports (5173, 5174, etc.)
const allowedOrigins = process.env.CLIENT_URL 
  ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']
  : '*';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman) or any localhost origin
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(null, true); // Permissive in dev
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Compression
app.use(compression());

// Logger
app.use(morgan('dev'));

// Payload size limit configuration
const maxUploadSize = parseInt(process.env.MAX_UPLOAD_SIZE || '52428800', 10);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      details: 'Rate limit exceeded, please try again later.'
    },
    message: 'Too many requests'
  }
});

// Rate limit write endpoints only; status/result polling runs every 2s and must not be throttled
app.use('/api/', (req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }
  return apiLimiter(req, res, next);
});

// Serve static assets in production if needed
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'UP',
      timestamp: new Date().toISOString()
    },
    message: 'Server is healthy'
  });
});

// REST route mounts
app.use('/api', analysisRoutes);

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      details: `Route ${req.originalUrl} does not exist.`
    },
    message: 'Route not found'
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Global Error Log:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      details: err.message || 'An unexpected error occurred on the server.'
    },
    message: err.message || 'Internal Server Error'
  });
});

export default app;
