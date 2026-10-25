import express from 'express';
import * as runController from '../controllers/runController.js';
import { runLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/:id', runController.getRun);
router.post('/:id/retry', runLimiter, runController.retryRun);

export default router;
