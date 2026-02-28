import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { Boilerplate } from './Boilerplate.node.js';

describe('Boilerplate node', () => {
  let node: Boilerplate;

  beforeEach(() => {
    node = new Boilerplate();
  });

  describe('description', () => {
    it('has correct name', () => {
      expect(node.description.name).toBe('boilerplate');
    });

    it('has correct inputs', () => {
      expect(node.description.inputs).toEqual([NodeConnectionTypes.Main]);
    });

    it('has correct outputs', () => {
      expect(node.description.outputs).toEqual([NodeConnectionTypes.Main]);
    });

    it('has subtitle defined', () => {
      expect(node.description.subtitle).toBeDefined();
    });
  });

  describe('execute — echo operation', () => {
    it('returns message merged with input JSON and pairedItem', async () => {
      const inputItem = { json: { existing: 'value' } };
      const mockContext = {
        getInputData: () => [inputItem],
        getNodeParameter: (name: string) => {
          if (name === 'operation') return 'echo';
          if (name === 'message') return 'hello';
          return undefined;
        },
        continueOnFail: () => false,
      } as unknown as IExecuteFunctions;

      const result = await node.execute.call(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual({ existing: 'value', message: 'hello' });
      expect(result[0][0].pairedItem).toEqual({ item: 0 });
    });

    it('respects continueOnFail on error', async () => {
      const mockContext = {
        getInputData: () => [{ json: {} }],
        getNodeParameter: () => {
          throw new Error('test error');
        },
        continueOnFail: () => true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = await node.execute.call(mockContext);

      expect(result[0][0].json).toEqual({ error: 'test error' });
      expect(result[0][0].pairedItem).toEqual({ item: 0 });
    });
  });
});
