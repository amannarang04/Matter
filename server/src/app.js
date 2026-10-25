import express from 'express';
import cors from 'cors';
import workflowRoutes from './routes/workflowRoutes.js';
import runRoutes from './routes/runRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching origin
      if (!origin || origin === clientOrigin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly CORS
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/workflows', workflowRoutes);
app.use('/api/runs', runRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
