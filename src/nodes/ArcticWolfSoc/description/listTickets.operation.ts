import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_TYPES } from '../constants.js';
import { makeOrganizationUuidField } from './common.fields.js';

function capitalize(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

// Status options retain per-value descriptions not derivable from the value alone
const STATUS_DESCRIPTIONS: Record<string, string> = {
  OPEN: 'Ticket is with Arctic Wolf',
  NEW: 'Ticket is with Arctic Wolf',
  PENDING: 'Ticket is awaiting customer response',
  HOLD: 'Ticket is with Arctic Wolf',
  CLOSED: 'Ticket is resolved and closed',
};

const statusOptions: INodePropertyOptions[] = TICKET_STATUSES.map((v) => ({
  name: capitalize(v),
  value: v,
  description: STATUS_DESCRIPTIONS[v] ?? '',
}));

const priorityOptions: INodePropertyOptions[] = [
  { name: '- Any -', value: '' },
  ...TICKET_PRIORITIES.map((v) => ({ name: capitalize(v), value: v })),
];

const typeOptions: INodePropertyOptions[] = [
  { name: '- Any -', value: '' },
  ...TICKET_TYPES.map((v) => ({ name: capitalize(v), value: v })),
];

export const getManyTicketsOperationOption: INodePropertyOptions = {
  name: 'Get Many',
  value: 'getMany',
  action: 'Get many tickets for an organization',
  description: 'Retrieve tickets for a specific organization',
};

export const getManyTicketsOperationFields: INodeProperties[] = [
  makeOrganizationUuidField('getMany', 'The organization to retrieve tickets for.'),
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    default: false,
    description: 'Whether to return all results or only up to a given limit',
    displayOptions: { show: { resource: ['ticket'], operation: ['getMany'] } },
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    typeOptions: { minValue: 1, maxValue: 100 },
    default: 50,
    description: 'Max number of tickets to return (1–100)',
    displayOptions: { show: { resource: ['ticket'], operation: ['getMany'], returnAll: [false] } },
  },
  {
    displayName: 'Filters',
    name: 'filters',
    type: 'collection',
    placeholder: 'Add Filter',
    default: {},
    displayOptions: { show: { resource: ['ticket'], operation: ['getMany'] } },
    options: [
      {
        displayName: 'Assignee Email',
        name: 'assigneeByEmail',
        type: 'string',
        default: '',
        description: 'Filter tickets by assignee email address',
      },
      {
        displayName: 'Assignee First Name',
        name: 'assigneeByFirstName',
        type: 'string',
        default: '',
        placeholder: 'e.g. Jane',
        description: 'Filter tickets by the first name of the assigned agent',
      },
      {
        displayName: 'Assignee Last Name',
        name: 'assigneeByLastName',
        type: 'string',
        default: '',
        placeholder: 'e.g. Smith',
        description: 'Filter tickets by the last name of the assigned agent',
      },
      {
        displayName: 'Created After',
        name: 'createdAfter',
        type: 'dateTime',
        default: '',
        description: 'Return tickets created after this date/time (ISO 8601)',
      },
      {
        displayName: 'Created Before',
        name: 'createdBefore',
        type: 'dateTime',
        default: '',
        description: 'Return tickets created before this date/time (ISO 8601)',
      },
      {
        displayName: 'Priority',
        name: 'priority',
        type: 'options',
        options: priorityOptions,
        default: '',
        description: 'Filter tickets by priority',
      },
      {
        displayName: 'Status',
        name: 'status',
        type: 'multiOptions',
        options: statusOptions,
        default: [],
        description: 'Filter tickets by one or more statuses',
      },
      {
        displayName: 'Type',
        name: 'type',
        type: 'options',
        options: typeOptions,
        default: '',
        description: 'Filter tickets by type',
      },
      {
        displayName: 'Updated After',
        name: 'updatedAfter',
        type: 'dateTime',
        default: '',
        description: 'Return tickets updated after this date/time (ISO 8601)',
      },
      {
        displayName: 'Updated Before',
        name: 'updatedBefore',
        type: 'dateTime',
        default: '',
        description: 'Return tickets updated before this date/time (ISO 8601)',
      },
    ],
  },
  {
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: { show: { resource: ['ticket'], operation: ['getMany'] } },
    options: [
      {
        displayName: 'Include Comments',
        name: 'includeComments',
        type: 'boolean',
        default: false,
        description: 'Whether to include ticket comments in the response',
      },
    ],
  },
];
