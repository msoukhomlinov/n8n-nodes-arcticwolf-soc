import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { requestBoilerplate } from '../lib/transport.js';
import { formatApiError, formatIdError } from './error-formatter.js';

/**
 * n8n injects these framework fields into every DynamicStructuredTool call.
 * Strip them before forwarding params to the API.
 */
const N8N_METADATA_FIELDS = new Set([
  'sessionId',
  'action',
  'chatInput',
  'tool',
  'toolName',
  'toolCallId',
]);

export async function executeBoilerplateTool(
  context: IExecuteFunctions,
  resource: string,
  operation: string,
  rawParams: Record<string, unknown>,
): Promise<string> {
  // Strip n8n framework metadata injected into every DynamicStructuredTool call
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    if (!N8N_METADATA_FIELDS.has(key)) params[key] = value;
  }

  try {
    switch (operation) {
      case 'echo': {
        const message = String(params.message ?? '');
        const result = await requestBoilerplate.call(context, 'POST', '/echo', {
          body: { message } as IDataObject,
        });
        return JSON.stringify({ result });
      }

      case 'get': {
        const id = params.id;
        if (typeof id !== 'number') {
          return JSON.stringify(formatIdError(resource, operation));
        }
        const result = await requestBoilerplate.call(context, 'GET', `/${resource}/${id}`);
        return JSON.stringify({ result });
      }

      case 'getMany': {
        const qs: IDataObject = {};
        if (params.filter_field !== undefined) qs['filter_field'] = params.filter_field as string;
        if (params.filter_op !== undefined) qs['filter_op'] = params.filter_op as string;
        if (params.filter_value !== undefined)
          qs['filter_value'] = params.filter_value as string | number | boolean;
        qs['limit'] = typeof params.limit === 'number' ? params.limit : 10;

        const result = await requestBoilerplate.call(context, 'GET', `/${resource}`, { qs });
        const items = Array.isArray(result) ? result : [result];
        return JSON.stringify({ results: items, count: items.length });
      }

      case 'create': {
        const fields =
          params.fields && typeof params.fields === 'object'
            ? (params.fields as IDataObject)
            : {};
        const result = await requestBoilerplate.call(context, 'POST', `/${resource}`, {
          body: fields,
        });
        const itemId =
          result && typeof result === 'object' && 'id' in result ? result['id'] : undefined;
        return JSON.stringify({ success: true, operation: 'create', itemId, result });
      }

      case 'update': {
        const id = params.id;
        if (typeof id !== 'number') {
          return JSON.stringify(formatIdError(resource, operation));
        }
        const fields =
          params.fields && typeof params.fields === 'object'
            ? (params.fields as IDataObject)
            : {};
        const result = await requestBoilerplate.call(context, 'PATCH', `/${resource}/${id}`, {
          body: fields,
        });
        const itemId =
          result && typeof result === 'object' && 'id' in result ? result['id'] : id;
        return JSON.stringify({ success: true, operation: 'update', itemId, result });
      }

      case 'delete': {
        const id = params.id;
        if (typeof id !== 'number') {
          return JSON.stringify(formatIdError(resource, operation));
        }
        await requestBoilerplate.call(context, 'DELETE', `/${resource}/${id}`);
        return JSON.stringify({ success: true, operation: 'delete', result: { id, deleted: true } });
      }

      default:
        return JSON.stringify({
          error: true,
          errorType: 'UNSUPPORTED_OPERATION',
          message: `Unsupported operation: ${operation}`,
          operation: `${resource}.${operation}`,
          nextAction: 'Choose a supported operation from the node configuration.',
        });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return JSON.stringify(formatApiError(msg, resource, operation));
  }
}
