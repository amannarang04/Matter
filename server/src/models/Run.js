import mongoose from 'mongoose';

const RunSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
      index: true,
    },
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'success', 'failed'],
      default: 'pending',
      index: true,
    },
    runContext: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    finalOutput: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorSummary: {
      type: String,
      default: null,
    },
    nodeEvents: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

RunSchema.index({ workspaceId: 1, workflowId: 1, startedAt: -1 });
RunSchema.index({ workspaceId: 1, status: 1 });

export default mongoose.model('Run', RunSchema);
