import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { makeOrganizationUuidField, makeTicketIdField } from './common.fields.js';

export const getTicketOperationOption: INodePropertyOptions = {
  name: 'Get Ticket',
  value: 'getTicket',
  action: 'Get a ticket by ID',
  description: 'Retrieve a single ticket by its numeric ID',
};

export const getTicketOperationFields: INodeProperties[] = [
  makeOrganizationUuidField('getTicket', 'The organization the ticket belongs to.'),
  makeTicketIdField('getTicket', 'The numeric ID of the ticket to retrieve'),
  {
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: { show: { resource: ['ticket'], operation: ['getTicket'] } },
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
