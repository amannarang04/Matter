import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Workflow from '../models/Workflow.js';

export const CONTRACT_DISCOUNT_WORKFLOW = {
  name: 'Discount & Tier Evaluation',
  description:
    'Worked example from Matter workflow specification. Calculates discount, computes final price, and routes to Premium or Standard tier.',
  nodes: [
    {
      id: 'node-1',
      type: 'input',
      position: { x: 100, y: 160 },
      data: {
        label: 'Input Prices',
        values: {
          originalPrice: 1500,
          discountRate: 0.1,
        },
      },
    },
    {
      id: 'node-2',
      type: 'math',
      position: { x: 380, y: 160 },
      data: {
        label: 'Calculate Discount',
        left: { source: 'ref', key: 'originalPrice' },
        op: 'multiply',
        right: { source: 'ref', key: 'discountRate' },
        outputKey: 'discount',
      },
    },
    {
      id: 'node-3',
      type: 'math',
      position: { x: 660, y: 160 },
      data: {
        label: 'Calculate Discounted Price',
        left: { source: 'ref', key: 'originalPrice' },
        op: 'subtract',
        right: { source: 'ref', key: 'discount' },
        outputKey: 'discountedPrice',
      },
    },
    {
      id: 'node-4',
      type: 'condition',
      position: { x: 940, y: 160 },
      data: {
        label: 'Check Price Threshold',
        left: { source: 'ref', key: 'discountedPrice' },
        op: 'gt',
        right: { source: 'literal', value: 1000 },
      },
    },
    {
      id: 'node-5',
      type: 'output',
      position: { x: 1240, y: 80 },
      data: {
        label: 'Premium Tier Output',
        fields: [
          { key: 'originalPrice', value: { source: 'ref', key: 'originalPrice' } },
          { key: 'discount', value: { source: 'ref', key: 'discount' } },
          { key: 'discountedPrice', value: { source: 'ref', key: 'discountedPrice' } },
          { key: 'category', value: { source: 'literal', value: 'Premium' } },
        ],
      },
    },
    {
      id: 'node-6',
      type: 'output',
      position: { x: 1240, y: 320 },
      data: {
        label: 'Standard Tier Output',
        fields: [
          { key: 'originalPrice', value: { source: 'ref', key: 'originalPrice' } },
          { key: 'discount', value: { source: 'ref', key: 'discount' } },
          { key: 'discountedPrice', value: { source: 'ref', key: 'discountedPrice' } },
          { key: 'category', value: { source: 'literal', value: 'Standard' } },
        ],
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'node-1', target: 'node-2' },
    { id: 'e2-3', source: 'node-2', target: 'node-3' },
    { id: 'e3-4', source: 'node-3', target: 'node-4' },
    { id: 'e4-5', source: 'node-4', target: 'node-5', sourceHandle: 'true' },
    { id: 'e4-6', source: 'node-4', target: 'node-6', sourceHandle: 'false' },
  ],
};

export async function seedInitialWorkflows() {
  const count = await Workflow.countDocuments();
  if (count === 0) {
    const created = await Workflow.create(CONTRACT_DISCOUNT_WORKFLOW);
    console.log(`Seeded default Discount & Tier Evaluation workflow (ID: ${created._id})`);
    return created;
  } else {
    console.log(`Database already contains ${count} workflow(s). Skipping seed.`);
    return null;
  }
}

// Standalone execution entrypoint (e.g., npm run seed)
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('src/utils/seed.js');
if (isDirectRun) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('FATAL: MONGODB_URI environment variable is required to run seed script.');
    process.exit(1);
  }

  (async () => {
    try {
      console.log(`Connecting to MongoDB at ${uri}...`);
      await mongoose.connect(uri);
      await seedInitialWorkflows();
      await mongoose.disconnect();
      console.log('Seeding finished successfully.');
      process.exit(0);
    } catch (err) {
      console.error('Seeding failed:', err);
      process.exit(1);
    }
  })();
}
