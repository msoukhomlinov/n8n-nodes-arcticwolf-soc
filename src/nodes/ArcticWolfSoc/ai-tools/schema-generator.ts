import { z } from 'zod';
import type { RuntimeZod } from './runtime.js';
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_TYPES } from '../constants.js';

// Reusable sub-schemas
const organizationUuidSchema = z
  .string()
  .describe(
    'UUID of the organization (e.g. "422dbd5b-68fa-48d7-ac0f-4e42bc73a40b"). ' +
      "Call arcticwolfsoc_organization with operation 'getMany' first if unknown.",
  );

const ticketIdSchema = z
  .number()
  .int()
  .positive()
  .describe(
    "Numeric ID of the ticket (integer). Call arcticwolfsoc_ticket with operation 'getMany' to find this if unknown.",
  );

// ---------------------------------------------------------------------------
// Per-operation schema functions (also used as building blocks by buildUnifiedSchema)
// ---------------------------------------------------------------------------

export function getGetManyTicketsSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    status: z
      .array(z.enum(TICKET_STATUSES))
      .optional()
      .describe(
        'Filter by one or more statuses (OR logic within this field). ' +
          'OPEN/NEW/HOLD = with Arctic Wolf team (active work); PENDING = awaiting customer response; CLOSED = resolved. ' +
          'Omit to return all statuses.',
      ),
    priority: z
      .enum(TICKET_PRIORITIES)
      .optional()
      .describe('Filter by priority: LOW, NORMAL, HIGH, or URGENT. Omit to return all priorities.'),
    type: z
      .enum(TICKET_TYPES)
      .optional()
      .describe('Filter by type: QUESTION, INCIDENT, PROBLEM, or TASK. Omit to return all types.'),
    assigneeByEmail: z
      .string()
      .email()
      .optional()
      .describe('Filter by exact assignee email address.'),
    assigneeByFirstName: z.string().optional().describe('Filter by assignee first name.'),
    assigneeByLastName: z.string().optional().describe('Filter by assignee last name.'),
    updatedAfter: z
      .string()
      .optional()
      .describe(
        'Return tickets updated after this datetime. ISO 8601 format, e.g. "2024-01-15T00:00:00Z".',
      ),
    updatedBefore: z
      .string()
      .optional()
      .describe('Return tickets updated before this datetime. ISO 8601 format.'),
    createdAfter: z
      .string()
      .optional()
      .describe('Return tickets created after this datetime. ISO 8601 format.'),
    createdBefore: z
      .string()
      .optional()
      .describe('Return tickets created before this datetime. ISO 8601 format.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe(
        'Max tickets per page. Min 1, max 100, default 20. Increase to 100 if you expect many results.',
      ),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Tickets to skip before returning results. Use with limit for pagination. Default 0.',
      ),
  });
}

export function getGetTicketSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    ticketId: ticketIdSchema,
  });
}

export function getCloseTicketSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    ticketId: ticketIdSchema,
    comment: z
      .string()
      .optional()
      .describe('Optional comment explaining why the ticket is being closed.'),
  });
}

export function getAddCommentSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    ticketId: ticketIdSchema,
    body: z
      .string()
      .max(65535)
      .describe('Comment text to post. Plain text, required, max 65535 characters.'),
  });
}

export function getGetManyCommentsSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    ticketId: z
      .number()
      .int()
      .positive()
      .describe(
        "Numeric ID of the ticket whose comments to retrieve. Call arcticwolfsoc_ticket with operation 'getMany' to find this if unknown.",
      ),
  });
}

export function getGetCommentSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    ticketId: z
      .number()
      .int()
      .positive()
      .describe('Numeric ID of the ticket that contains the comment.'),
    commentId: z
      .number()
      .int()
      .positive()
      .describe(
        "Numeric ID of the comment to retrieve. Call arcticwolfsoc_ticketComment with operation 'getMany' first to list all comments and find this ID.",
      ),
  });
}

export function getGetManyOrganizationsSchema() {
  return z.object({
    root: z
      .string()
      .optional()
      .describe(
        'ADVANCED USE ONLY. Must be a UUID (e.g. "422dbd5b-68fa-48d7-ac0f-4e42bc73a40b") obtained from a previous call to this tool. ' +
          'Do NOT set this field when looking up an organization by name or customerID — omit it entirely and filter the returned list yourself. ' +
          'Setting a name, slug, or guessed value here will cause an error.',
      ),
  });
}

// ---------------------------------------------------------------------------
// Unified schema builder
// ---------------------------------------------------------------------------

const AW_OP_LABELS: Record<string, string> = {
  getMany: 'Get Many',
  getTicket: 'Get Ticket',
  closeTicket: 'Close Ticket',
  getComment: 'Get Comment',
  addComment: 'Add Comment',
};

function getSchemaForOperation(resource: string, operation: string): z.ZodObject<z.ZodRawShape> {
  switch (`${resource}.${operation}`) {
    case 'ticket.getMany':
      return getGetManyTicketsSchema();
    case 'ticket.getTicket':
      return getGetTicketSchema();
    case 'ticket.closeTicket':
      return getCloseTicketSchema();
    case 'ticketComment.getMany':
      return getGetManyCommentsSchema();
    case 'ticketComment.getComment':
      return getGetCommentSchema();
    case 'ticketComment.addComment':
      return getAddCommentSchema();
    case 'organization.getMany':
      return getGetManyOrganizationsSchema();
    default:
      return z.object({});
  }
}

export function buildUnifiedSchema(
  resource: string,
  operations: string[],
): z.ZodObject<z.ZodRawShape> {
  const enabledOps = Array.from(new Set(operations));

  if (enabledOps.length === 0) {
    return z.object({ operation: z.string().describe('Operation to perform') });
  }

  const operationEnum = z
    .enum(enabledOps as [string, ...string[]])
    .describe(`Operation to perform. Allowed values: ${enabledOps.join(', ')}.`);

  const fieldSources = new Map<string, z.ZodTypeAny>();
  const fieldOps = new Map<string, Set<string>>();

  for (const operation of enabledOps) {
    const schema = getSchemaForOperation(resource, operation);
    for (const [field, fieldSchema] of Object.entries(schema.shape)) {
      if (!fieldSources.has(field)) fieldSources.set(field, fieldSchema);
      if (!fieldOps.has(field)) fieldOps.set(field, new Set<string>());
      fieldOps.get(field)?.add(operation);
    }
  }

  const mergedShape: Record<string, z.ZodTypeAny> = { operation: operationEnum };

  for (const [field, fieldSchema] of fieldSources.entries()) {
    const opsForField = Array.from(fieldOps.get(field) ?? []);
    const baseDescription =
      (fieldSchema as z.ZodTypeAny & { description?: string }).description ?? '';
    const opsDescription = `Used by operations: ${opsForField.map((op) => AW_OP_LABELS[op] ?? op).join(', ')}.`;
    const description = baseDescription ? `${baseDescription} ${opsDescription}` : opsDescription;
    mergedShape[field] = fieldSchema.optional().describe(description);
  }

  return z.object(mergedShape);
}

// ---------------------------------------------------------------------------
// Runtime Zod conversion — converts compile-time schemas to runtime Zod instances
// so that n8n's instanceof ZodType check passes (MCP Trigger path)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRuntimeZodSchema(schema: any, runtimeZ: RuntimeZod): any {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const def = schema?._def as Record<string, unknown> | undefined;
  const typeName = def?.typeName as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let converted: any;

  switch (typeName) {
    case 'ZodString': {
      let s = runtimeZ.string();
      for (const check of (def?.checks as Array<{ kind: string; value: number }>) ?? []) {
        switch (check.kind) {
          case 'min':
            s = s.min(check.value);
            break;
          case 'max':
            s = s.max(check.value);
            break;
          case 'email':
            s = s.email();
            break;
          case 'url':
            s = s.url();
            break;
          case 'uuid':
            s = s.uuid();
            break;
          default:
            break;
        }
      }
      converted = s;
      break;
    }
    case 'ZodNumber': {
      let n = runtimeZ.number();
      for (const check of (def?.checks as Array<{
        kind: string;
        value: number;
        inclusive?: boolean;
      }>) ?? []) {
        switch (check.kind) {
          case 'int':
            n = n.int();
            break;
          case 'min':
            n = check.inclusive === false ? n.gt(check.value) : n.min(check.value);
            break;
          case 'max':
            n = check.inclusive === false ? n.lt(check.value) : n.max(check.value);
            break;
          default:
            break;
        }
      }
      converted = n;
      break;
    }
    case 'ZodBoolean':
      converted = runtimeZ.boolean();
      break;
    case 'ZodUnknown':
      converted = runtimeZ.unknown();
      break;
    case 'ZodArray':
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      converted = runtimeZ.array(toRuntimeZodSchema(def?.type, runtimeZ));
      break;
    case 'ZodEnum':
      converted = runtimeZ.enum(def?.values as [string, ...string[]]);
      break;
    case 'ZodRecord':
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      converted = runtimeZ.record(toRuntimeZodSchema(def?.valueType, runtimeZ));
      break;
    case 'ZodObject': {
      const rawShape =
        typeof def?.shape === 'function'
          ? (def.shape as () => Record<string, unknown>)()
          : (def?.shape as Record<string, unknown>);
      const runtimeShape: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rawShape ?? {})) {
        runtimeShape[key] = toRuntimeZodSchema(value, runtimeZ);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      let obj: any = runtimeZ.object(runtimeShape as Parameters<typeof runtimeZ.object>[0]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      if (def?.unknownKeys === 'passthrough') obj = obj.passthrough();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      if (def?.unknownKeys === 'strict') obj = obj.strict();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      converted = obj;
      break;
    }
    case 'ZodOptional':
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      converted = toRuntimeZodSchema(def?.innerType, runtimeZ).optional();
      break;
    case 'ZodNullable':
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      converted = toRuntimeZodSchema(def?.innerType, runtimeZ).nullable();
      break;
    case 'ZodDefault':
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      converted = toRuntimeZodSchema(def?.innerType, runtimeZ).default(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        typeof def?.defaultValue === 'function'
          ? (def.defaultValue as () => unknown)()
          : def?.defaultValue,
      );
      break;
    case 'ZodLiteral':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      converted = runtimeZ.literal(def?.value as any);
      break;
    case 'ZodUnion':
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      converted = runtimeZ.union(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return
        ((def?.options as unknown[]) ?? []).map((o) => toRuntimeZodSchema(o, runtimeZ)) as [
          ReturnType<RuntimeZod['string']>,
          ReturnType<RuntimeZod['string']>,
          ...ReturnType<RuntimeZod['string']>[],
        ],
      );
      break;
    default:
      converted = runtimeZ.unknown();
      break;
  }

  const description =
    typeof (schema as { description?: string })?.description === 'string'
      ? (schema as { description: string }).description
      : undefined;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (description && typeof (converted as Record<string, unknown>)['describe'] === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return (converted as Record<string, (d: string) => unknown>)['describe'](description);
  }
  return converted;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withRuntimeZod<T>(schemaBuilder: () => T, runtimeZ: RuntimeZod): T {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return toRuntimeZodSchema(schemaBuilder(), runtimeZ);
}

export function getRuntimeSchemaBuilders(runtimeZ: RuntimeZod) {
  return {
    buildUnifiedSchema: (resource: string, operations: string[]) =>
      withRuntimeZod(() => buildUnifiedSchema(resource, operations), runtimeZ),
  };
}
