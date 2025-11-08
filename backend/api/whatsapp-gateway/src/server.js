/**
 * WhatsApp Gateway API Server
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import env from './config/env.js';
import logger from './utils/logger.js';
import webhookRoutes from './routes/webhook.js';
import pool from './db/pool.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
});
app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Authentication middleware for webhooks
function authenticateWebhook(req, res, next) {
  const token = req.headers['x-whatsapp-token'];
  
  if (!token || token !== env.WEBHOOK_TOKEN) {
    logger.warn('Unauthorized webhook request', { ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

// Authentication middleware for API endpoints
function authenticateApi(req, res, next) {
  const token = req.headers['x-api-token'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!token || token !== env.API_TOKEN) {
    logger.warn('Unauthorized API request', { ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    res.status(200).json({
      status: 'healthy',
      service: 'whatsapp-gateway-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Routes
app.use('/webhooks', authenticateWebhook, webhookRoutes);

// API routes (to be implemented)
app.get('/api/messages/:sessionName/:chatId', authenticateApi, async (req, res) => {
  try {
    const { sessionName, chatId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    const { getMessages } = await import('./services/messageService.js');
    const messages = await getMessages(sessionName, chatId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    
    res.json({ messages });
  } catch (error) {
    logger.error('Failed to get messages', { error: error.message });
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

app.get('/api/contacts/:sessionName', authenticateApi, async (req, res) => {
  try {
    const { sessionName } = req.params;
    const { limit = 100, offset = 0, type } = req.query;
    
    const { getContacts } = await import('./services/contactService.js');
    const contacts = await getContacts(sessionName, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      type,
    });
    
    res.json({ contacts });
  } catch (error) {
    logger.error('Failed to get contacts', { error: error.message });
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

app.get('/api/sessions', authenticateApi, async (req, res) => {
  try {
    const { getActiveSessions } = await import('./services/sessionService.js');
    const sessions = await getActiveSessions();
    
    res.json({ sessions });
  } catch (error) {
    logger.error('Failed to get sessions', { error: error.message });
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });
  
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = env.PORT;

app.listen(PORT, '0.0.0.0', () => {
  logger.info('WhatsApp Gateway API started', {
    port: PORT,
    env: env.NODE_ENV,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  await pool.end();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  await pool.end();
  
  process.exit(0);
});

