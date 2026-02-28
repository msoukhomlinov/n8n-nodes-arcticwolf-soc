import { z } from 'zod';
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_TYPES } from '../constants.js';

// Reusable sub-schemas
const organizationUuidSchema = z
  .string()
  .describe('The UUID of the organization to scope the operation to');

const ticketIdSchema = z.number().int().positive().describe('The numeric ID of the ticket');

const includeCommentsSchema = z
  .boolean()
  .optional()
  .describe('Whether to include comments in the response (default: false)');

// Ticket schemas

export function getGetManyTicketsSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    status: z
      .array(z.enum(TICKET_STATUSES))
      .optional()
      .describe('Filter by ticket status values. Multiple values allowed.'),
    priority: z
      .enum(TICKET_PRIORITIES)
      .optional()
      .describe('Filter by ticket priority: LOW, NORMAL, HIGH, or URGENT'),
    type: z
      .enum(TICKET_TYPES)
      .optional()
      .describe('Filter by ticket type: QUESTION, INCIDENT, PROBLEM, or TASK'),
    assigneeByEmail: z
      .string()
      .email()
      .optional()
      .describe('Filter tickets assigned to this email address'),
    assigneeByFirstName: z
      .string()
      .optional()
      .describe('Filter tickets by the first name of the assigned agent'),
    assigneeByLastName: z
      .string()
      .optional()
      .describe('Filter tickets by the last name of the assigned agent'),
    updatedAfter: z
      .string()
      .optional()
      .describe('Return tickets updated after this ISO 8601 date-time (e.g. 2024-01-15T00:00:00Z)'),
    updatedBefore: z
      .string()
      .optional()
      .describe('Return tickets updated before this ISO 8601 date-time'),
    createdAfter: z
      .string()
      .optional()
      .describe('Return tickets created after this ISO 8601 date-time'),
    createdBefore: z
      .string()
      .optional()
      .describe('Return tickets created before this ISO 8601 date-time'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of tickets to return (1–100, default 20)'),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Number of tickets to skip for pagination (default 0)'),
    includeComments: includeCommentsSchema,
  });
}

export function getGetTicketSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    ticketId: ticketIdSchema,
    includeComments: includeCommentsSchema,
  });
}

export function getCloseTicketSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    ticketId: ticketIdSchema,
    comment: z
      .string()
      .optional()
      .describe('Optional comment to include when closing the ticket'),
  });
}

export function getAddCommentSchema() {
  return z.object({
    organizationUuid: organizationUuidSchema,
    ticketId: ticketIdSchema,
    body: z
      .string()
      .max(65535)
      .describe('The comment text to add to the ticket (max 65535 characters)'),
  });
}

// Organization schemas

export function getGetManyOrganizationsSchema() {
  return z.object({
    root: z
      .string()
      .optional()
      .describe(
        'UUID of the parent organization to scope the listing. ' +
        'Omit to return all organizations accessible with the current credentials. ' +
        'Use the id field from a previous organization_getMany call.',
      ),
  });
}
