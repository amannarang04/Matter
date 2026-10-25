export const TEMPLATES = [
  {
    id: 'discount-tier',
    name: 'Discount & Tier Evaluation (Contract Example)',
    description: 'Calculates discount rate, evaluates threshold, and routes to Premium or Standard tier.',
    nodes: [
      {
        id: 'node-1',
        type: 'input',
        position: { x: 80, y: 160 },
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
        position: { x: 680, y: 160 },
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
        position: { x: 980, y: 160 },
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
        position: { x: 1300, y: 60 },
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
        position: { x: 1300, y: 320 },
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
  },
  {
    id: 'markup-tax',
    name: 'Tax & Markup Transformation Flow',
    description: 'Demonstrates input, arithmetic, rounding transform, and output construction.',
    nodes: [
      {
        id: 'inp-1',
        type: 'input',
        position: { x: 80, y: 150 },
        data: {
          label: 'Base Item Data',
          values: {
            costPrice: 49.99,
            taxRate: 1.18,
          },
        },
      },
      {
        id: 'math-tax',
        type: 'math',
        position: { x: 380, y: 150 },
        data: {
          label: 'Apply Tax',
          left: { source: 'ref', key: 'costPrice' },
          op: 'multiply',
          right: { source: 'ref', key: 'taxRate' },
          outputKey: 'grossPrice',
        },
      },
      {
        id: 'trans-round',
        type: 'transform',
        position: { x: 680, y: 150 },
        data: {
          label: 'Round Final Price',
          input: { source: 'ref', key: 'grossPrice' },
          operation: 'round',
          outputKey: 'roundedPrice',
        },
      },
      {
        id: 'out-tax',
        type: 'output',
        position: { x: 980, y: 150 },
        data: {
          label: 'Invoice Result',
          fields: [
            { key: 'costPrice', value: { source: 'ref', key: 'costPrice' } },
            { key: 'grossPrice', value: { source: 'ref', key: 'grossPrice' } },
            { key: 'roundedPrice', value: { source: 'ref', key: 'roundedPrice' } },
          ],
        },
      },
    ],
    edges: [
      { id: 'e_i1_mt', source: 'inp-1', target: 'math-tax' },
      { id: 'e_mt_tr', source: 'math-tax', target: 'trans-round' },
      { id: 'e_tr_out', source: 'trans-round', target: 'out-tax' },
    ],
  },
];
