import { describe, it, expect } from 'vitest';
import { ExecutionEngine } from '../src/services/executionEngine.js';
import { validateWorkflowDefinition } from '../src/utils/validator.js';
import { ValidationError } from '../src/utils/errors.js';

describe('Workflow Execution Engine & Validator', () => {
  const discountWorkflow = {
    nodes: [
      {
        id: 'node-1',
        type: 'input',
        position: { x: 100, y: 100 },
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
        position: { x: 350, y: 100 },
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
        position: { x: 600, y: 100 },
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
        position: { x: 850, y: 100 },
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
        position: { x: 1100, y: 50 },
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
        position: { x: 1100, y: 250 },
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

  it('validates the Discount Workflow successfully', () => {
    expect(() => validateWorkflowDefinition(discountWorkflow)).not.toThrow();
  });

  it('executes the Discount Workflow according to CONTRACT.md specification', async () => {
    const engine = new ExecutionEngine(discountWorkflow);
    const events = [];
    engine.on('event', (e) => events.push(e));

    const result = await engine.run();

    expect(result.status).toBe('success');
    expect(result.runContext).toEqual({
      originalPrice: 1500,
      discountRate: 0.1,
      discount: 150,
      discountedPrice: 1350,
    });
    expect(result.finalOutput).toEqual({
      originalPrice: 1500,
      discount: 150,
      discountedPrice: 1350,
      category: 'Premium',
    });

    // Check that node-5 succeeded and node-6 was skipped
    const node5Event = events.find((e) => e.type === 'node' && e.nodeId === 'node-5' && e.status === 'success');
    const node6Event = events.find((e) => e.type === 'node' && e.nodeId === 'node-6');
    expect(node5Event).toBeDefined();
    expect(node6Event).toBeDefined();
    expect(node6Event.status).toBe('skipped');
  });

  it('executes the false branch when threshold is not met', async () => {
    // Clone and alter discount rate to make discounted price < 1000
    const lowerPriceWorkflow = JSON.parse(JSON.stringify(discountWorkflow));
    lowerPriceWorkflow.nodes[0].data.values.originalPrice = 800;

    const engine = new ExecutionEngine(lowerPriceWorkflow);
    const result = await engine.run();

    expect(result.status).toBe('success');
    expect(result.finalOutput.category).toBe('Standard');
    expect(result.finalOutput.discountedPrice).toBe(720);
  });

  it('executes transform and delay nodes correctly', async () => {
    const transformWorkflow = {
      nodes: [
        {
          id: 'n1',
          type: 'input',
          data: { values: { num: 42.6 } },
        },
        {
          id: 'n2',
          type: 'delay',
          data: { ms: 50 },
        },
        {
          id: 'n3',
          type: 'transform',
          data: {
            input: { source: 'ref', key: 'num' },
            operation: 'round',
            outputKey: 'roundedNum',
          },
        },
        {
          id: 'n4',
          type: 'output',
          data: {
            fields: [{ key: 'final', value: { source: 'ref', key: 'roundedNum' } }],
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' },
      ],
    };

    const engine = new ExecutionEngine(transformWorkflow);
    const result = await engine.run();

    expect(result.status).toBe('success');
    expect(result.runContext.roundedNum).toBe(43);
    expect(result.finalOutput.final).toBe(43);
  });

  it('detects cycles in workflow and rejects with ValidationError', () => {
    const cyclicWorkflow = {
      nodes: [
        { id: 'n1', type: 'input', data: { values: { x: 1 } } },
        { id: 'n2', type: 'math', data: { left: { source: 'literal', value: 1 }, op: 'add', right: { source: 'literal', value: 1 }, outputKey: 'res' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n1' },
      ],
    };

    expect(() => validateWorkflowDefinition(cyclicWorkflow)).toThrow(ValidationError);
  });

  it('rejects duplicate output keys with ValidationError', () => {
    const duplicateKeyWorkflow = {
      nodes: [
        { id: 'n1', type: 'input', data: { values: { duplicateKey: 1 } } },
        { id: 'n2', type: 'math', data: { left: { source: 'literal', value: 1 }, op: 'add', right: { source: 'literal', value: 1 }, outputKey: 'duplicateKey' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    expect(() => validateWorkflowDefinition(duplicateKeyWorkflow)).toThrow(ValidationError);
  });

  it('fails math node gracefully on division by zero with a descriptive error mentioning node label', async () => {
    const divZeroWorkflow = {
      nodes: [
        { id: 'n1', type: 'input', data: { values: { num: 100 } } },
        {
          id: 'n2',
          type: 'math',
          data: {
            label: 'Divide By Zero',
            left: { source: 'ref', key: 'num' },
            op: 'divide',
            right: { source: 'literal', value: 0 },
            outputKey: 'res',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const engine = new ExecutionEngine(divZeroWorkflow);
    const result = await engine.run();

    expect(result.status).toBe('failed');
    expect(result.errorSummary).toBe('Node "Divide By Zero" (math): cannot divide by zero');

    const failedExecution = engine.nodeExecutions.find((ne) => ne.nodeId === 'n2');
    expect(failedExecution).toBeDefined();
    expect(failedExecution.status).toBe('failed');
    expect(failedExecution.error).toBe('Node "Divide By Zero" (math): cannot divide by zero');
    expect(failedExecution.nodeId).toBe('n2');
  });

  it('falls back to node id in error message when node label is empty or missing', async () => {
    const divZeroNoLabelWorkflow = {
      nodes: [
        { id: 'n1', type: 'input', data: { values: { num: 100 } } },
        {
          id: 'n2',
          type: 'math',
          data: {
            label: '   ',
            left: { source: 'ref', key: 'num' },
            op: 'divide',
            right: { source: 'literal', value: 0 },
            outputKey: 'res',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const engine = new ExecutionEngine(divZeroNoLabelWorkflow);
    const result = await engine.run();

    expect(result.status).toBe('failed');
    expect(result.errorSummary).toBe('Node "n2" (math): cannot divide by zero');

    const failedExecution = engine.nodeExecutions.find((ne) => ne.nodeId === 'n2');
    expect(failedExecution.error).toBe('Node "n2" (math): cannot divide by zero');
    expect(failedExecution.nodeId).toBe('n2');
  });

  it('fails math node with clear error when operands are non-numeric mentioning label', async () => {
    const nonNumericWorkflow = {
      nodes: [
        { id: 'n1', type: 'input', data: { values: { str: 'abc' } } },
        {
          id: 'n2',
          type: 'math',
          data: {
            label: 'Invalid Math',
            left: { source: 'ref', key: 'str' },
            op: 'add',
            right: { source: 'literal', value: 10 },
            outputKey: 'res',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const engine = new ExecutionEngine(nonNumericWorkflow);
    const result = await engine.run();

    expect(result.status).toBe('failed');
    expect(result.errorSummary).toBe('Node "Invalid Math" (math): operands must evaluate to numbers (received left: string, right: number)');

    const failedExecution = engine.nodeExecutions.find((ne) => ne.nodeId === 'n2');
    expect(failedExecution).toBeDefined();
    expect(failedExecution.status).toBe('failed');
    expect(failedExecution.error).toBe('Node "Invalid Math" (math): operands must evaluate to numbers (received left: string, right: number)');
  });

  it('fails transform node with clear error when input is not numeric for round or add', async () => {
    const invalidTransformWorkflow = {
      nodes: [
        { id: 'n1', type: 'input', data: { values: { invalidVal: 'not_a_number' } } },
        {
          id: 'n2',
          type: 'transform',
          data: {
            label: 'Bad Round',
            input: { source: 'ref', key: 'invalidVal' },
            operation: 'round',
            outputKey: 'rounded',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const engine = new ExecutionEngine(invalidTransformWorkflow);
    const result = await engine.run();

    expect(result.status).toBe('failed');
    expect(result.errorSummary).toBe('Node "Bad Round" (transform): transform round operation requires numeric input');

    const failedExecution = engine.nodeExecutions.find((ne) => ne.nodeId === 'n2');
    expect(failedExecution).toBeDefined();
    expect(failedExecution.status).toBe('failed');
    expect(failedExecution.error).toBe('Node "Bad Round" (transform): transform round operation requires numeric input');
  });

  it('includes node label in validation error messages and falls back to id when label is empty', () => {
    const workflowWithLabels = {
      nodes: [
        { id: 'inp-1', type: 'input', data: { label: 'Initial Inputs', values: { x: 1 } } },
        {
          id: 'trans-1',
          type: 'transform',
          data: {
            label: 'Add Bonus',
            input: { source: 'ref', key: 'x' },
            operation: 'add',
            outputKey: 'bonus',
            // param is missing, which is required for add
          },
        },
        {
          id: 'cond-1',
          type: 'condition',
          data: {
            // no label
            left: { source: 'ref', key: 'bonus' },
            op: 'gt',
            right: { source: 'literal', value: 5 },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'inp-1', target: 'trans-1' },
        { id: 'e2', source: 'trans-1', target: 'cond-1' },
        // Condition outgoing edge missing sourceHandle ('true' or 'false')
        { id: 'e3', source: 'cond-1', target: 'trans-1' },
      ],
    };

    try {
      validateWorkflowDefinition(workflowWithLabels);
      expect.fail('Should have thrown ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.details).toBeDefined();

      const transError = err.details.find((d) => d.nodeId === 'trans-1');
      expect(transError).toBeDefined();
      expect(transError.message).toContain('Node "Add Bonus" (transform):');
      expect(transError.nodeId).toBe('trans-1');

      const condError = err.details.find((d) => d.nodeId === 'cond-1');
      expect(condError).toBeDefined();
      expect(condError.message).toContain('Node "cond-1" (condition):');
      expect(condError.nodeId).toBe('cond-1');
    }
  });
});

