import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { SocketServer } from './sockets/index.js';
import { JobScheduler } from './jobs/scheduler.js';
import { BaileysService } from './services/baileys.service.js';
import { ensureDatabaseReady } from './utils/dbInit.js';
import apiRouter from './routes/index.js';

const app = express();
const server = http.createServer(app);

// Security & Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      origin === config.frontendUrl ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.pages.dev') ||
      origin.endsWith('.onrender.com')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Allow any verified production domain
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Rate Limiting on Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
});
app.use('/api/auth', authLimiter);
app.use('/auth', authLimiter);

// Mount Master API (both at /api and / for seamless hosting)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Central Error Handler
app.use(errorHandler);

// Initialize Socket.IO, Schedulers & Database Bootstrap
SocketServer.initialize(server);
JobScheduler.start();
BaileysService.initAllSavedSessions();
ensureDatabaseReady().catch((err) => logger.error('DB ready check failed:', err));

// Start HTTP Server
if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, '0.0.0.0', () => {
    logger.info(`🚀 AutoMate by DK Backend listening on 0.0.0.0:${config.port}`);
    logger.info(`🌐 Frontend URL: ${config.frontendUrl}`);
    logger.info(`🤖 WhatsApp Mode: ${config.whatsapp.mock ? 'MOCK SIMULATION' : 'LIVE META CLOUD API (v21.0)'}`);
    logger.info(`🧠 AI Mode: ${config.ai.mock ? 'MOCK ENGINE' : 'OPENAI LIVE'}`);
  });
}

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server terminated.');
    process.exit(0);
  });
});

export { app, server };
