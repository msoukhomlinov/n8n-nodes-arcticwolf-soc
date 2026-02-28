import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { makeOrganizationUuidField, makeTicketIdField } from './common.fields.js';

export const closeTicketOperationOption: INodePropertyOptions = {
  name: 'Close Ticket',
  value: 'closeTicket',
  action: 'Close a ticket',
  description: 'Close a ticket by its numeric ID',
};

export const closeTicketOperationFields: INodeProperties[] = [
  makeOrganizationUuidField('closeTicket', 'The organization the ticket belongs to.'),
  makeTicketIdField('closeTicket', 'The numeric ID of the ticket to close'),
  {
    displayName: 'Comment',
    name: 'comment',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    description: 'Optional comment to add when closing the ticket',
    displayOptions: { show: { resource: ['ticket'], operation: ['closeTicket'] } },
  },
];
