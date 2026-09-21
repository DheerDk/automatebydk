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
import apiRouter from './routes/index.js';

const app = express();
const server = http.createServer(app);

// Security & Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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

// Mount Master API
app.use('/api', apiRouter);

// Central Error Handler
app.use(errorHandler);

// Initialize Socket.IO & Schedulers
SocketServer.initialize(server);
JobScheduler.start();
BaileysService.initAllSavedSessions();

// Start HTTP Server
if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, () => {
    logger.info(`🚀 ChatFlow AI Backend listening on http://localhost:${config.port}`);
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
