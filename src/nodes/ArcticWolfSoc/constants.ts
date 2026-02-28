export const CREDENTIAL_NAME = 'arcticWolfSocApi';
export const ORGS_API_BASE_URL = 'https://eloc.global-prod.arcticwolf.net';
export const TICKET_API_URL_TEMPLATE = 'https://ticket-api.managedgw.{region}-prod.arcticwolf.net';

export const REGIONS = [
  { name: 'US001', value: 'us001' },
  { name: 'US002', value: 'us002' },
  { name: 'US003', value: 'us003' },
  { name: 'EU001', value: 'eu001' },
  { name: 'AU001', value: 'au001' },
  { name: 'CA001', value: 'ca001' },
] as const;

export const TICKET_STATUSES = ['OPEN', 'NEW', 'PENDING', 'HOLD', 'CLOSED'] as const;
export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const TICKET_TYPES = ['QUESTION', 'INCIDENT', 'PROBLEM', 'TASK'] as const;

// Mutable string[] so .includes(string) works without a cast at call sites
export const WRITE_OPERATIONS: readonly string[] = ['closeTicket', 'addComment'];

// n8n injects these into every DynamicStructuredTool call; strip before routing to API
export const N8N_METADATA_FIELDS = new Set([
  'sessionId',
  'action',
  'chatInput',
  'tool',
  'toolName',
  'toolCallId',
]);
