import type { IExecuteFunctions } from 'n8n-workflow';
import { z } from 'zod';
import { buildUnifiedSchema } from './schema-generator.js';
import { buildUnifiedDescription } from './description-builders.js';
import {
  formatApiError,
  formatMissingIdError,
  formatNotFoundError,
  formatNoResultsFound,
} from './error-formatter.js';
import { executeArcticWolfSocTool } from './tool-executor.js';

jest.mock('../lib/transport.js', () => ({
  requestArcticWolfSoc: jest.fn(),
  getTicketApiBaseUrl: jest.fn(() => 'https://ticket-api.managedgw.us001-prod.arcticwolf.net'),
  getOrgsApiBaseUrl: jest.fn(() => 'https://eloc.global-prod.arcticwolf.net'),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const transport = require('../lib/transport.js') as {
  requestArcticWolfSoc: jest.Mock;
  getTicketApiBaseUrl: jest.Mock;
  getOrgsApiBaseUrl: jest.Mock;
};

const mockContext = {} as unknown as IExecuteFunctions;

describe('buildUnifiedSchema', () => {
  describe('operation field', () => {
    it('includes a required operation enum field', () => {
      const schema = buildUnifiedSchema('ticket', ['getMany', 'getTicket']);
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      expect(shape['operation']).toBeDefined();
      // The operation field should be a ZodEnum (not optional)
      const opDef = shape['operation']?._def as { typeName: string };
      expect(opDef.typeName).toBe('ZodEnum');
    });

    it('enum includes exactly the provided operations', () => {
      const schema = buildUnifiedSchema('ticket', ['getMany', 'closeTicket']);
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      const opDef = shape['operation']?._def as { values: string[] };
      expect(opDef.values).toEqual(expect.arrayContaining(['getMany', 'closeTicket']));
      expect(opDef.values).toHaveLength(2);
    });

    it('deduplicates repeated operations', () => {
      const schema = buildUnifiedSchema('ticket', ['getMany', 'getMany', 'getTicket']);
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      const opDef = shape['operation']?._def as { values: string[] };
      expect(opDef.values).toHaveLength(2);
    });
  });

  describe('field merging', () => {
    it('includes fields from all selected operations', () => {
      const schema = buildUnifiedSchema('ticket', ['getMany', 'closeTicket']);
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      // getMany-only fields
      expect(shape['status']).toBeDefined();
      expect(shape['limit']).toBeDefined();
      // closeTicket-only fields
      expect(shape['comment']).toBeDefined();
      // shared field
      expect(shape['organizationUuid']).toBeDefined();
      expect(shape['ticketId']).toBeDefined();
    });

    it('makes all non-operation fields optional', () => {
      const schema = buildUnifiedSchema('ticket', ['getTicket']);
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      // ticketId is required in getGetTicketSchema, but merged schema makes it optional
      const ticketIdDef = shape['ticketId']?._def as { typeName: string };
      expect(ticketIdDef.typeName).toBe('ZodOptional');
    });

    it('appends "Used by operations:" to field descriptions', () => {
      const schema = buildUnifiedSchema('ticket', ['getMany', 'getTicket']);
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      // limit is only in getMany
      const limitSchema = shape['limit'] as z.ZodTypeAny & { description?: string };
      expect(limitSchema.description).toContain('Used by operations:');
      expect(limitSchema.description).toContain('Get Many');
    });

    it('returns schema with only operation field when no operations provided', () => {
      const schema = buildUnifiedSchema('ticket', []);
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      expect(Object.keys(shape)).toEqual(['operation']);
    });
  });

  describe('organization resource', () => {
    it('builds schema with operation and optional root field', () => {
      const schema = buildUnifiedSchema('organization', ['getMany']);
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      expect(shape['operation']).toBeDefined();
      expect(shape['root']).toBeDefined();
    });
  });

  describe('ticketComment resource', () => {
    it('includes commentId field when getComment is selected', () => {
      const schema = buildUnifiedSchema('ticketComment', ['getComment']);
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      expect(shape['commentId']).toBeDefined();
    });

    it('includes body field when addComment is selected', () => {
      const schema = buildUnifiedSchema('ticketComment', ['addComment']);
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      expect(shape['body']).toBeDefined();
    });
  });
});

describe('buildUnifiedDescription', () => {
  const NOW = '2024-06-15T12:00:00Z';

  it('includes the datetime reference snippet', () => {
    const desc = buildUnifiedDescription('Ticket', 'ticket', ['getMany'], NOW);
    expect(desc).toContain(NOW);
    expect(desc).toContain('current UTC when these tools were loaded');
  });

  it('uses canonical cross-tool reference for organizationUuid', () => {
    const desc = buildUnifiedDescription('Ticket', 'ticket', ['getMany'], NOW);
    expect(desc).toContain("arcticwolfsoc_organization with operation 'getMany'");
  });

  it('uses canonical cross-tool reference in ticketComment description', () => {
    const desc = buildUnifiedDescription('Ticket Comment', 'ticketComment', ['getMany'], NOW);
    expect(desc).toContain("arcticwolfsoc_ticket with operation 'getMany'");
  });

  it('includes all requested operations in the description', () => {
    const desc = buildUnifiedDescription(
      'Ticket',
      'ticket',
      ['getMany', 'getTicket', 'closeTicket'],
      NOW,
    );
    expect(desc).toContain('getMany');
    expect(desc).toContain('getTicket');
    expect(desc).toContain('closeTicket');
  });

  it('includes getMany operation guidance', () => {
    const desc = buildUnifiedDescription('Ticket', 'ticket', ['getMany'], NOW);
    expect(desc).toContain('getMany');
    expect(desc).toContain('Filters');
  });

  it('includes getTicket operation guidance', () => {
    const desc = buildUnifiedDescription('Ticket', 'ticket', ['getTicket'], NOW);
    expect(desc).toContain('getTicket');
    expect(desc).toContain('ticketId');
  });

  it('includes closeTicket operation guidance', () => {
    const desc = buildUnifiedDescription('Ticket', 'ticket', ['closeTicket'], NOW);
    expect(desc).toContain('closeTicket');
    expect(desc).toContain('PREREQUISITE');
  });

  it('is under 2000 characters for all ticket operations', () => {
    const desc = buildUnifiedDescription(
      'Ticket',
      'ticket',
      ['getMany', 'getTicket', 'closeTicket'],
      NOW,
    );
    expect(desc.length).toBeLessThan(2000);
  });

  it('is under 2000 characters for all ticketComment operations', () => {
    const desc = buildUnifiedDescription(
      'Ticket Comment',
      'ticketComment',
      ['getMany', 'getComment', 'addComment'],
      NOW,
    );
    expect(desc.length).toBeLessThan(2000);
  });

  it('is under 2000 characters for all organization operations', () => {
    const desc = buildUnifiedDescription('Organization', 'organization', ['getMany'], NOW);
    expect(desc.length).toBeLessThan(2000);
  });
});

describe('error-formatter', () => {
  describe('formatMissingIdError', () => {
    it('has correct errorType', () => {
      const err = formatMissingIdError('ticket', 'getTicket');
      expect(err.error).toBe(true);
      expect(err.errorType).toBe('MISSING_ENTITY_ID');
    });

    it('sets operation to resource.operation', () => {
      const err = formatMissingIdError('ticket', 'closeTicket');
      expect(err.operation).toBe('ticket.closeTicket');
    });

    it('nextAction for ticket references arcticwolfsoc_ticket getMany', () => {
      const err = formatMissingIdError('ticket', 'getTicket');
      expect(err.nextAction).toContain('arcticwolfsoc_ticket');
      expect(err.nextAction).toContain("operation 'getMany'");
    });

    it('nextAction for ticketComment references both arcticwolfsoc_ticket and arcticwolfsoc_ticketComment', () => {
      const err = formatMissingIdError('ticketComment', 'getComment');
      expect(err.nextAction).toContain('arcticwolfsoc_ticket');
      expect(err.nextAction).toContain('arcticwolfsoc_ticketComment');
      expect(err.nextAction).toContain("operation 'getMany'");
    });
  });

  describe('formatNotFoundError', () => {
    it('has correct errorType', () => {
      const err = formatNotFoundError('ticket', 'getTicket', 'Ticket 42');
      expect(err.error).toBe(true);
      expect(err.errorType).toBe('ENTITY_NOT_FOUND');
    });

    it('includes entity label in message', () => {
      const err = formatNotFoundError('ticket', 'getTicket', 'Ticket 42');
      expect(err.message).toContain('Ticket 42');
    });

    it('nextAction for ticket references arcticwolfsoc_ticket getMany', () => {
      const err = formatNotFoundError('ticket', 'getTicket', 'Ticket 42');
      expect(err.nextAction).toContain('arcticwolfsoc_ticket');
      expect(err.nextAction).toContain("operation 'getMany'");
    });

    it('nextAction for ticketComment references arcticwolfsoc_ticketComment getMany', () => {
      const err = formatNotFoundError('ticketComment', 'getComment', 'Comment 7');
      expect(err.nextAction).toContain('arcticwolfsoc_ticketComment');
      expect(err.nextAction).toContain("operation 'getMany'");
    });
  });

  describe('formatNoResultsFound', () => {
    it('has correct errorType', () => {
      const err = formatNoResultsFound('ticket', 'getMany', { status: ['OPEN'] });
      expect(err.error).toBe(true);
      expect(err.errorType).toBe('NO_RESULTS_FOUND');
    });

    it('includes filters in context', () => {
      const filters = { status: ['OPEN'], priority: 'HIGH' };
      const err = formatNoResultsFound('ticket', 'getMany', filters);
      expect(err.context?.['filtersUsed']).toEqual(filters);
    });

    it('includes actionable nextAction', () => {
      const err = formatNoResultsFound('ticket', 'getMany', { status: ['CLOSED'] });
      expect(err.nextAction).toBeTruthy();
      expect(err.nextAction.length).toBeGreaterThan(0);
    });
  });

  describe('formatApiError', () => {
    it('maps forbidden to PERMISSION_DENIED', () => {
      const err = formatApiError('forbidden', 'ticket', 'getMany');
      expect(err.errorType).toBe('PERMISSION_DENIED');
    });

    it('maps not found to ENTITY_NOT_FOUND', () => {
      const err = formatApiError('not found', 'ticket', 'getTicket');
      expect(err.errorType).toBe('ENTITY_NOT_FOUND');
    });

    it('maps missing/required to MISSING_REQUIRED_FIELDS', () => {
      const err = formatApiError('required field missing', 'ticket', 'closeTicket');
      expect(err.errorType).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('defaults to API_ERROR for unknown messages', () => {
      const err = formatApiError('unexpected banana error', 'ticket', 'getMany');
      expect(err.errorType).toBe('API_ERROR');
    });
  });
});

describe('executeArcticWolfSocTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ticket.getTicket — null guard', () => {
    it('returns ENTITY_NOT_FOUND when API returns null', async () => {
      transport.requestArcticWolfSoc.mockResolvedValue(null);
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticket',
          'getTicket',
          { organizationUuid: 'org-uuid', ticketId: 42 },
          'us001',
        ),
      ) as { errorType: string };
      expect(result.errorType).toBe('ENTITY_NOT_FOUND');
    });

    it('returns ENTITY_NOT_FOUND when API returns empty object', async () => {
      transport.requestArcticWolfSoc.mockResolvedValue({});
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticket',
          'getTicket',
          { organizationUuid: 'org-uuid', ticketId: 42 },
          'us001',
        ),
      ) as { errorType: string };
      expect(result.errorType).toBe('ENTITY_NOT_FOUND');
    });

    it('returns ENTITY_NOT_FOUND when API returns empty array', async () => {
      transport.requestArcticWolfSoc.mockResolvedValue([]);
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticket',
          'getTicket',
          { organizationUuid: 'org-uuid', ticketId: 42 },
          'us001',
        ),
      ) as { errorType: string };
      expect(result.errorType).toBe('ENTITY_NOT_FOUND');
    });

    it('returns the ticket when API returns a populated object', async () => {
      const ticket = { id: 42, status: 'OPEN', title: 'Test ticket' };
      transport.requestArcticWolfSoc.mockResolvedValue(ticket);
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticket',
          'getTicket',
          { organizationUuid: 'org-uuid', ticketId: 42 },
          'us001',
        ),
      ) as { result: unknown };
      expect(result.result).toEqual(ticket);
    });
  });

  describe('ticket.getMany — filtered-empty guard', () => {
    it('returns NO_RESULTS_FOUND when filters are set and results are empty', async () => {
      transport.requestArcticWolfSoc.mockResolvedValue({ results: [], meta: { total: 0 } });
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticket',
          'getMany',
          { organizationUuid: 'org-uuid', status: ['OPEN'], priority: 'HIGH' },
          'us001',
        ),
      ) as { errorType: string; context: { filtersUsed: Record<string, unknown> } };
      expect(result.errorType).toBe('NO_RESULTS_FOUND');
      expect(result.context.filtersUsed).toBeDefined();
    });

    it('returns empty results without error when no filters are set', async () => {
      transport.requestArcticWolfSoc.mockResolvedValue({ results: [], meta: { total: 0 } });
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticket',
          'getMany',
          { organizationUuid: 'org-uuid' },
          'us001',
        ),
      ) as { results: unknown[]; count: number };
      expect(result.results).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('returns results when tickets are found', async () => {
      const tickets = [{ id: 1 }, { id: 2 }];
      transport.requestArcticWolfSoc.mockResolvedValue({ results: tickets, meta: { total: 2 } });
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticket',
          'getMany',
          { organizationUuid: 'org-uuid', status: ['OPEN'] },
          'us001',
        ),
      ) as { results: unknown[]; count: number };
      expect(result.results).toEqual(tickets);
      expect(result.count).toBe(2);
    });
  });

  describe('ticket.closeTicket', () => {
    it('returns success on close', async () => {
      transport.requestArcticWolfSoc.mockResolvedValue({ id: 42, status: 'CLOSED' });
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticket',
          'closeTicket',
          { organizationUuid: 'org-uuid', ticketId: 42 },
          'us001',
        ),
      ) as { success: boolean; operation: string };
      expect(result.success).toBe(true);
      expect(result.operation).toBe('closeTicket');
    });

    it('returns MISSING_ENTITY_ID when ticketId is missing', async () => {
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticket',
          'closeTicket',
          { organizationUuid: 'org-uuid' },
          'us001',
        ),
      ) as { errorType: string };
      expect(result.errorType).toBe('MISSING_ENTITY_ID');
    });
  });

  describe('ticketComment.getMany', () => {
    it('returns comments from ticket response', async () => {
      const comments = [{ id: 1, body: 'hello' }];
      transport.requestArcticWolfSoc.mockResolvedValue({ comments });
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticketComment',
          'getMany',
          { organizationUuid: 'org-uuid', ticketId: 10 },
          'us001',
        ),
      ) as { results: unknown[]; count: number };
      expect(result.results).toEqual(comments);
      expect(result.count).toBe(1);
    });

    it('returns MISSING_ENTITY_ID when ticketId is missing', async () => {
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticketComment',
          'getMany',
          { organizationUuid: 'org-uuid' },
          'us001',
        ),
      ) as { errorType: string };
      expect(result.errorType).toBe('MISSING_ENTITY_ID');
    });
  });

  describe('ticketComment.getComment', () => {
    it('returns the matching comment by id', async () => {
      const comments = [
        { id: 1, body: 'first' },
        { id: 7, body: 'target' },
      ];
      transport.requestArcticWolfSoc.mockResolvedValue({ comments });
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticketComment',
          'getComment',
          { organizationUuid: 'org-uuid', ticketId: 10, commentId: 7 },
          'us001',
        ),
      ) as { result: { id: number; body: string } };
      expect(result.result).toEqual({ id: 7, body: 'target' });
    });

    it('returns ENTITY_NOT_FOUND when comment id not in list', async () => {
      transport.requestArcticWolfSoc.mockResolvedValue({ comments: [{ id: 1, body: 'other' }] });
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticketComment',
          'getComment',
          { organizationUuid: 'org-uuid', ticketId: 10, commentId: 99 },
          'us001',
        ),
      ) as { errorType: string };
      expect(result.errorType).toBe('ENTITY_NOT_FOUND');
    });
  });

  describe('ticketComment.addComment', () => {
    it('returns success after posting comment', async () => {
      transport.requestArcticWolfSoc.mockResolvedValue({ id: 5, body: 'new comment' });
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticketComment',
          'addComment',
          { organizationUuid: 'org-uuid', ticketId: 10, body: 'new comment' },
          'us001',
        ),
      ) as { success: boolean; operation: string };
      expect(result.success).toBe(true);
      expect(result.operation).toBe('addComment');
    });

    it('returns MISSING_ENTITY_ID when body is absent', async () => {
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticketComment',
          'addComment',
          { organizationUuid: 'org-uuid', ticketId: 10 },
          'us001',
        ),
      ) as { errorType: string };
      expect(result.errorType).toBe('MISSING_ENTITY_ID');
    });

    it('returns MISSING_ENTITY_ID when body is empty string', async () => {
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticketComment',
          'addComment',
          { organizationUuid: 'org-uuid', ticketId: 10, body: '   ' },
          'us001',
        ),
      ) as { errorType: string };
      expect(result.errorType).toBe('MISSING_ENTITY_ID');
    });
  });

  describe('organization.getMany', () => {
    it('returns list of organizations', async () => {
      const orgs = [{ id: 'uuid-1', name: 'Acme Corp' }];
      transport.requestArcticWolfSoc.mockResolvedValue(orgs);
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'organization',
          'getMany',
          {},
          'us001',
        ),
      ) as { results: unknown[]; count: number };
      expect(result.results).toEqual(orgs);
      expect(result.count).toBe(1);
    });

    it('wraps a non-array response in an array', async () => {
      const org = { id: 'uuid-1', name: 'Acme Corp' };
      transport.requestArcticWolfSoc.mockResolvedValue(org);
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'organization',
          'getMany',
          {},
          'us001',
        ),
      ) as { results: unknown[]; count: number };
      expect(result.results).toEqual([org]);
      expect(result.count).toBe(1);
    });
  });

  describe('n8n metadata stripping', () => {
    it('does not pass operation to the API for ticket.getMany', async () => {
      transport.requestArcticWolfSoc.mockResolvedValue({ results: [{ id: 1 }], meta: {} });
      await executeArcticWolfSocTool(
        mockContext,
        'ticket',
        'getMany',
        { organizationUuid: 'org-uuid', operation: 'getMany', sessionId: 'abc', tool: 'arcticwolfsoc_ticket' },
        'us001',
      );
      // The qs object passed to requestArcticWolfSoc should not contain 'operation', 'sessionId', or 'tool'
      const callArgs = transport.requestArcticWolfSoc.mock.calls[0] as unknown[];
      const options = callArgs[3] as { qs?: Record<string, unknown> };
      expect(options.qs?.['operation']).toBeUndefined();
      expect(options.qs?.['sessionId']).toBeUndefined();
      expect(options.qs?.['tool']).toBeUndefined();
    });
  });

  describe('unsupported operations', () => {
    it('returns UNSUPPORTED_OPERATION error for unknown ticket operation', async () => {
      const result = JSON.parse(
        await executeArcticWolfSocTool(mockContext, 'ticket', 'deleteThat', {}, 'us001'),
      ) as { errorType: string };
      expect(result.errorType).toBe('UNSUPPORTED_OPERATION');
    });

    it('returns UNSUPPORTED_RESOURCE error for unknown resource', async () => {
      const result = JSON.parse(
        await executeArcticWolfSocTool(mockContext, 'invoice', 'getMany', {}, 'us001'),
      ) as { errorType: string };
      expect(result.errorType).toBe('UNSUPPORTED_RESOURCE');
    });
  });

  describe('API error handling', () => {
    it('returns structured error JSON when requestArcticWolfSoc throws', async () => {
      transport.requestArcticWolfSoc.mockRejectedValue(new Error('forbidden access'));
      const result = JSON.parse(
        await executeArcticWolfSocTool(
          mockContext,
          'ticket',
          'getMany',
          { organizationUuid: 'org-uuid' },
          'us001',
        ),
      ) as { error: boolean; errorType: string };
      expect(result.error).toBe(true);
      expect(result.errorType).toBe('PERMISSION_DENIED');
    });
  });
});
