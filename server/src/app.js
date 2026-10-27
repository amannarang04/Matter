import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import workflowRoutes from './routes/workflowRoutes.js';
import runRoutes from './routes/runRoutes.js';
import { workspaceMiddleware } from './middleware/workspaceMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Trust reverse proxy (Render, Cloudflare, etc.) for accurate client IP resolution
app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests without origin (health checks, server-to-server, curl)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Workspace-Id'],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const dbStatus = isDbConnected ? 'connected' : 'disconnected';

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'ok' : 'degraded',
    database: dbStatus,
  });
});

app.use('/api/workflows', workspaceMiddleware, workflowRoutes);
app.use('/api/runs', workspaceMiddleware, runRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
