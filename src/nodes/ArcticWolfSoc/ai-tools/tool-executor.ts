import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { requestArcticWolfSoc, getTicketApiBaseUrl, getOrgsApiBaseUrl } from '../lib/transport.js';
import {
  formatApiError,
  formatMissingIdError,
  formatNotFoundError,
  formatNoResultsFound,
} from './error-formatter.js';
import { N8N_METADATA_FIELDS } from '../constants.js';
import { buildListTicketsQs } from '../lib/params.js';

export async function executeArcticWolfSocTool(
  context: IExecuteFunctions,
  resource: string,
  operation: string,
  rawParams: Record<string, unknown>,
  region: string,
): Promise<string> {
  // Strip n8n framework metadata injected into every DynamicStructuredTool call.
  // N8N_METADATA_FIELDS includes 'operation' as defense-in-depth so it never
  // reaches API request bodies regardless of which execution path is used.
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    if (!N8N_METADATA_FIELDS.has(key)) params[key] = value;
  }

  const ticketBaseUrl = getTicketApiBaseUrl(region);
  const orgsBaseUrl = getOrgsApiBaseUrl();

  try {
    if (resource === 'ticket') {
      const organizationUuid = String(params['organizationUuid'] ?? '');

      switch (operation) {
        case 'getMany': {
          const qs = buildListTicketsQs({
            status: Array.isArray(params['status']) ? (params['status'] as string[]) : undefined,
            priority: params['priority'] as string | undefined,
            type: params['type'] as string | undefined,
            assigneeByEmail: params['assigneeByEmail'] as string | undefined,
            assigneeByFirstName: params['assigneeByFirstName'] as string | undefined,
            assigneeByLastName: params['assigneeByLastName'] as string | undefined,
            updatedAfter: params['updatedAfter'] as string | undefined,
            updatedBefore: params['updatedBefore'] as string | undefined,
            createdAfter: params['createdAfter'] as string | undefined,
            createdBefore: params['createdBefore'] as string | undefined,
            limit: typeof params['limit'] === 'number' ? params['limit'] : undefined,
            offset: typeof params['offset'] === 'number' ? params['offset'] : undefined,
          });

          const result = await requestArcticWolfSoc.call(
            context,
            'GET',
            ticketBaseUrl,
            `/api/v1/organizations/${organizationUuid}/tickets`,
            { qs },
          );
          const paginated = result as { results?: unknown[]; meta?: unknown };
          const tickets = Array.isArray(paginated?.results) ? paginated.results : [];

          // Filtered empty → signal to LLM rather than returning misleading empty success.
          // Exclude pagination params (limit/offset) — those are always present and are not
          // semantic filters that would cause zero results.
          const PAGINATION_KEYS = new Set(['limit', 'offset']);
          const hasFilters = Object.entries(qs).some(
            ([k, v]) => !PAGINATION_KEYS.has(k) && v !== undefined && v !== null && v !== '',
          );
          if (tickets.length === 0 && hasFilters) {
            const filtersUsed = Object.fromEntries(
              Object.entries(qs).filter(
                ([k, v]) => !PAGINATION_KEYS.has(k) && v !== undefined && v !== null && v !== '',
              ),
            );
            return JSON.stringify(formatNoResultsFound(resource, operation, filtersUsed));
          }

          return JSON.stringify({ results: tickets, count: tickets.length, meta: paginated?.meta });
        }

        case 'getTicket': {
          const ticketId = params['ticketId'];
          if (typeof ticketId !== 'number') {
            return JSON.stringify(formatMissingIdError(resource, operation));
          }
          const result = await requestArcticWolfSoc.call(
            context,
            'GET',
            ticketBaseUrl,
            `/api/v1/organizations/${organizationUuid}/tickets/${ticketId}`,
            { qs: {} as IDataObject },
          );
          // Null guard — prevents LLM from hallucinating when API returns 200 with empty body
          const isMissing =
            result === null ||
            result === undefined ||
            (Array.isArray(result) && result.length === 0) ||
            (typeof result === 'object' &&
              !Array.isArray(result) &&
              Object.keys(result as object).length === 0);
          if (isMissing) {
            return JSON.stringify(
              formatNotFoundError(resource, operation, `Ticket ${ticketId}`),
            );
          }
          return JSON.stringify({ result });
        }

        case 'closeTicket': {
          const ticketId = params['ticketId'];
          if (typeof ticketId !== 'number') {
            return JSON.stringify(formatMissingIdError(resource, operation));
          }
          const body: IDataObject = {};
          if (params['comment']) body['comment'] = params['comment'] as string;
          const result = await requestArcticWolfSoc.call(
            context,
            'POST',
            ticketBaseUrl,
            `/api/v1/organizations/${organizationUuid}/tickets/${ticketId}/close`,
            { body },
          );
          return JSON.stringify({ success: true, operation: 'closeTicket', result });
        }

        default:
          return JSON.stringify({
            error: true,
            errorType: 'UNSUPPORTED_OPERATION',
            message: `Unsupported ticket operation: ${operation}`,
            operation: `${resource}.${operation}`,
            nextAction: 'Choose a supported operation from the node configuration.',
          });
      }
    } else if (resource === 'ticketComment') {
      const organizationUuid = String(params['organizationUuid'] ?? '');
      const ticketId = params['ticketId'];

      if (typeof ticketId !== 'number') {
        return JSON.stringify(formatMissingIdError(resource, operation));
      }

      switch (operation) {
        case 'getMany': {
          const result = await requestArcticWolfSoc.call(
            context,
            'GET',
            ticketBaseUrl,
            `/api/v1/organizations/${organizationUuid}/tickets/${ticketId}`,
            { qs: { includeComments: true } as IDataObject },
          );
          const comments = (result as { comments?: unknown[] })?.comments ?? [];
          return JSON.stringify({ results: comments, count: comments.length });
        }

        case 'getComment': {
          const commentId = params['commentId'];
          if (typeof commentId !== 'number') {
            return JSON.stringify(formatMissingIdError(resource, operation));
          }
          const result = await requestArcticWolfSoc.call(
            context,
            'GET',
            ticketBaseUrl,
            `/api/v1/organizations/${organizationUuid}/tickets/${ticketId}`,
            { qs: { includeComments: true } as IDataObject },
          );
          const comments = (result as { comments?: Array<Record<string, unknown>> })?.comments ?? [];
          const comment = comments.find((c) => c['id'] === commentId);
          if (!comment) {
            return JSON.stringify(
              formatNotFoundError(resource, operation, `Comment ${commentId}`),
            );
          }
          return JSON.stringify({ result: comment });
        }

        case 'addComment': {
          const body = params['body'];
          if (typeof body !== 'string' || !body.trim()) {
            return JSON.stringify(formatMissingIdError(resource, operation));
          }
          const result = await requestArcticWolfSoc.call(
            context,
            'POST',
            ticketBaseUrl,
            `/api/v1/organizations/${organizationUuid}/tickets/${ticketId}/comments`,
            { body: { body } },
          );
          return JSON.stringify({ success: true, operation: 'addComment', result });
        }

        default:
          return JSON.stringify({
            error: true,
            errorType: 'UNSUPPORTED_OPERATION',
            message: `Unsupported ticketComment operation: ${operation}`,
            operation: `${resource}.${operation}`,
            nextAction: 'Choose a supported operation from the node configuration.',
          });
      }
    } else if (resource === 'organization') {
      switch (operation) {
        case 'getMany': {
          const qs: IDataObject = {};
          if (params['root']) qs['root'] = params['root'] as string;
          const result = await requestArcticWolfSoc.call(
            context,
            'GET',
            orgsBaseUrl,
            '/api/v1/organizations',
            { qs },
          );
          const items = Array.isArray(result) ? result : [result];
          return JSON.stringify({ results: items, count: items.length });
        }

        default:
          return JSON.stringify({
            error: true,
            errorType: 'UNSUPPORTED_OPERATION',
            message: `Unsupported organization operation: ${operation}`,
            operation: `${resource}.${operation}`,
            nextAction: 'Choose a supported operation from the node configuration.',
          });
      }
    }

    return JSON.stringify({
      error: true,
      errorType: 'UNSUPPORTED_RESOURCE',
      message: `Unsupported resource: ${resource}`,
      operation: `${resource}.${operation}`,
      nextAction:
        'Choose a supported resource (ticket, ticketComment, organization) from the node configuration.',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return JSON.stringify(formatApiError(msg, resource, operation));
  }
}
