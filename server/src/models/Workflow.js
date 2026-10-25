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

export default mongoose.model('Workflow', WorkflowSchema);
