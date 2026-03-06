import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { makeOrganizationUuidField, makeTicketIdField } from './common.fields.js';

export const addCommentOperationOption: INodePropertyOptions = {
  name: 'Add Comment',
  value: 'addComment',
  action: 'Add a comment to a ticket',
  description: 'Add a public or internal comment to an existing ticket',
};

export const addCommentOperationFields: INodeProperties[] = [
  makeOrganizationUuidField('addComment', 'The organization the ticket belongs to.', 'ticketComment'),
  makeTicketIdField('addComment', 'The numeric ID of the ticket to add a comment to', 'ticketComment'),
  {
    displayName: 'Comment',
    name: 'body',
    type: 'string',
    required: true,
    typeOptions: { rows: 6, maxLength: 65535 },
    default: '',
    description: 'The comment text to add to the ticket (max 65535 characters)',
    displayOptions: { show: { resource: ['ticketComment'], operation: ['addComment'] } },
  },
];
