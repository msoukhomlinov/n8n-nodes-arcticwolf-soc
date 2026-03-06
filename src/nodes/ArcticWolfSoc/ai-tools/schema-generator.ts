import { z } from 'zod';
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_TYPES } from '../constants.js';

// Reusable sub-schemas
const organizationUuidSchema = z
  .string()
  .describe('UUID of the organization (e.g. "422dbd5b-68fa-48d7-ac0f-4e42bc73a40b"). Use organization_getMany first if unknown.');

const ticketIdSchema = z.number().int().positive().describe('Numeric ID of the ticket (integer). Use ticket_getMany to find this if unknown.');


// Ticket schemas

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
    assigneeByFirstName: z
      .string()
      .optional()
      .describe('Filter by assignee first name.'),
    assigneeByLastName: z
      .string()
      .optional()
      .describe('Filter by assignee last name.'),
    updatedAfter: z
      .string()
      .optional()
      .describe('Return tickets updated after this datetime. ISO 8601 format, e.g. "2024-01-15T00:00:00Z".'),
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
      .describe('Max tickets per page. Min 1, max 100, default 20.'),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Tickets to skip before returning results. Use with limit for pagination. Default 0.'),
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

// Ticket Comment schemas

export function getGetManyCommentsSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    ticketId: z.number().int().positive().describe('Numeric ID of the ticket whose comments to retrieve. Use ticket_getMany to find this if unknown.'),
  });
}

export function getGetCommentSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    ticketId: z.number().int().positive().describe('Numeric ID of the ticket that contains the comment.'),
    commentId: z.number().int().positive().describe('Numeric ID of the comment to retrieve. Use ticketComment_getMany first to list all comments and find this ID.'),
  });
}

// Organization schemas

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
