import mongoose from 'mongoose';

const WorkflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Untitled Workflow',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
    nodes: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    edges: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

WorkflowSchema.index({ workspaceId: 1, updatedAt: -1 });

export default mongoose.model('Workflow', WorkflowSchema);
