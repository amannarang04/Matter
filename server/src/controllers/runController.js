import * as workflowService from '../services/workflowService.js';

export async function getRun(req, res, next) {
  try {
    const run = await workflowService.getRunById(req.params.id);
    res.status(200).json(run);
  } catch (err) {
    next(err);
  }
}
