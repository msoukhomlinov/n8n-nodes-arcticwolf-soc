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

export const DATE_RANGE_PRESETS = [
  { name: '- Any -', value: '' },
  { name: 'Today', value: 'today' },
  { name: 'Yesterday', value: 'yesterday' },
  { name: 'Last 24 Hours', value: 'last24h' },
  { name: 'Last 3 Days', value: 'last3d' },
  { name: 'Last 7 Days', value: 'last7d' },
  { name: 'Last 14 Days', value: 'last14d' },
  { name: 'Last 30 Days', value: 'last30d' },
  { name: 'Last 60 Days', value: 'last60d' },
  { name: 'Last 90 Days', value: 'last90d' },
  { name: 'This Week (Mon–Sun)', value: 'thisWeek' },
  { name: 'Last Week', value: 'lastWeek' },
  { name: 'This Month', value: 'thisMonth' },
  { name: 'Last Month', value: 'lastMonth' },
  { name: 'Last 6 Months', value: 'last6m' },
  { name: 'Last 12 Months', value: 'last12m' },
  { name: 'Custom', value: 'custom' },
];

// Mutable string[] so .includes(string) works without a cast at call sites
export const WRITE_OPERATIONS: readonly string[] = ['closeTicket', 'addComment'];

// n8n injects these into every tool call (via execute() or DynamicStructuredTool); strip before routing to API
export const N8N_METADATA_FIELDS = new Set([
  'sessionId',
  'action',
  'chatInput',
  'root',       // n8n canvas root node UUID — collides with organization API root param; LLM should not pass this
  'tool',
  'toolName',
  'toolCallId',
  'operation',  // unified tool routing field — must not reach API bodies (defense-in-depth)
]);
