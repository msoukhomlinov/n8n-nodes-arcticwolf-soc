import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { ArcticWolfSoc } from './ArcticWolfSoc.node.js';

describe('ArcticWolfSoc node', () => {
  let node: ArcticWolfSoc;

  beforeEach(() => {
    node = new ArcticWolfSoc();
  });

  describe('description', () => {
    it('has correct name', () => {
      expect(node.description.name).toBe('arcticWolfSoc');
    });

    it('has correct displayName', () => {
      expect(node.description.displayName).toBe('Arctic Wolf SOC');
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

    it('requires arcticWolfSocApi credential', () => {
      expect(node.description.credentials).toEqual([
        { name: 'arcticWolfSocApi', required: true },
      ]);
    });

    it('has usableAsTool enabled', () => {
      expect(node.description.usableAsTool).toBe(true);
    });
  });

  describe('execute — continueOnFail', () => {
    it('returns error object when continueOnFail is true and operation throws', async () => {
      const mockContext = {
        getInputData: () => [{ json: {} }],
        getCredentials: async () => ({ region: 'us001' }),
        getNodeParameter: (name: string) => {
          if (name === 'resource') return 'ticket';
          if (name === 'operation') throw new Error('test error');
          return undefined;
        },
        continueOnFail: () => true,
      } as unknown as IExecuteFunctions;

      const result = await node.execute.call(mockContext);

      expect(result[0][0].json).toEqual({ error: 'test error' });
      expect(result[0][0].pairedItem).toEqual({ item: 0 });
    });

    it('re-throws error when continueOnFail is false', async () => {
      const mockContext = {
        getInputData: () => [{ json: {} }],
        getCredentials: async () => ({ region: 'us001' }),
        getNodeParameter: (name: string) => {
          if (name === 'resource') return 'ticket';
          if (name === 'operation') throw new Error('fatal error');
          return undefined;
        },
        continueOnFail: () => false,
      } as unknown as IExecuteFunctions;

      await expect(node.execute.call(mockContext)).rejects.toThrow('fatal error');
    });
  });

  describe('execute — getMany tickets pagination', () => {
    it('returnAll: true fetches all pages and returns combined results', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
      const page2 = [{ id: 101 }, { id: 102 }];

      const mockRequestWithAuthentication = jest.fn()
        .mockResolvedValueOnce({ results: page1 })
        .mockResolvedValueOnce({ results: page2 });

      const mockContext = {
        getInputData: () => [{ json: {} }],
        getCredentials: async () => ({ region: 'us001' }),
        getNodeParameter: (name: string, _index: number, fallback?: unknown) => {
          if (name === 'resource') return 'ticket';
          if (name === 'operation') return 'getMany';
          if (name === 'organizationUuid') return 'test-org-uuid';
          if (name === 'returnAll') return true;
          if (name === 'filters') return {};
          if (name === 'options') return {};
          return fallback;
        },
        continueOnFail: () => false,
        helpers: { requestWithAuthentication: mockRequestWithAuthentication },
        getNode: () => ({ name: 'test', type: 'test', typeVersion: 1, position: [0, 0] as [number, number] }),
      } as unknown as IExecuteFunctions;

      const result = await node.execute.call(mockContext);

      expect(result[0]).toHaveLength(102);
      expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(2);
    });

    it('returnAll: false returns up to limit results in a single call', async () => {
      const tickets = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
      const mockRequestWithAuthentication = jest.fn().mockResolvedValue({ results: tickets });

      const mockContext = {
        getInputData: () => [{ json: {} }],
        getCredentials: async () => ({ region: 'us001' }),
        getNodeParameter: (name: string, _index: number, fallback?: unknown) => {
          if (name === 'resource') return 'ticket';
          if (name === 'operation') return 'getMany';
          if (name === 'organizationUuid') return 'test-org-uuid';
          if (name === 'returnAll') return false;
          if (name === 'limit') return 10;
          if (name === 'filters') return {};
          if (name === 'options') return {};
          return fallback;
        },
        continueOnFail: () => false,
        helpers: { requestWithAuthentication: mockRequestWithAuthentication },
        getNode: () => ({ name: 'test', type: 'test', typeVersion: 1, position: [0, 0] as [number, number] }),
      } as unknown as IExecuteFunctions;

      const result = await node.execute.call(mockContext);

      expect(result[0]).toHaveLength(10);
      expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
    });
  });
});
