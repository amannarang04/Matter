import express from 'express';
import * as runController from '../controllers/runController.js';

const router = express.Router();

router.get('/:id', runController.getRun);
router.post('/:id/retry', runController.retryRun);

export default router;
