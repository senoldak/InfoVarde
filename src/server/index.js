// src/server/index.js
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './db.js';
import channelRoutes from './routes/channels.js';
import announcementRoutes from './routes/announcements.js';
import aiRoutes from './routes/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Ensure database initialized
  initDatabase();

  // API Routes
  app.use('/api/channels', channelRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/ai', aiRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'InfoVarde API',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  const server = http.createServer(app);
  return { app, server };
}

// Start standalone if executed directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  const PORT = process.env.PORT || 3001;
  const { server } = createServer();
  server.listen(PORT, () => {
    console.log(`📡 InfoVarde API Server listening on http://localhost:${PORT}`);
  });
}
