import { z } from 'zod';

export function getEchoSchema() {
  return z.object({
    message: z.string().describe('The message text to echo back'),
  });
}

export function getGetSchema() {
  return z.object({
    id: z.number().describe('Numeric entity ID to retrieve'),
  });
}

export function getGetManySchema() {
  return z.object({
    filter_field: z.string().optional().describe('Field name to filter on'),
    filter_op: z
      .enum(['eq', 'noteq', 'gt', 'gte', 'lt', 'lte', 'contains'])
      .optional()
      .describe('Filter operator (default: eq)'),
    filter_value: z
      .union([z.string(), z.number(), z.boolean()])
      .optional()
      .describe('Value to filter by'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Max results to return (1–100, default 10)'),
  });
}

export function getCreateSchema() {
  return z.object({
    fields: z
      .record(z.unknown())
      .describe('Key-value pairs of fields to set on the new record'),
  });
}

export function getUpdateSchema() {
  return z.object({
    id: z.number().describe('Numeric entity ID to update'),
    fields: z
      .record(z.unknown())
      .describe('Key-value pairs of fields to update (omitted fields are unchanged)'),
  });
}

export function getDeleteSchema() {
  return z.object({
    id: z.number().describe('Numeric entity ID to delete'),
  });
}
