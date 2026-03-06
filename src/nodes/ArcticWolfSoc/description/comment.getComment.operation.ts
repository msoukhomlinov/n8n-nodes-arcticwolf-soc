import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { makeOrganizationUuidField, makeTicketIdField } from './common.fields.js';

export const getCommentOperationOption: INodePropertyOptions = {
  name: 'Get Comment',
  value: 'getComment',
  action: 'Get a comment by ID',
  description: 'Retrieve a single comment by its numeric ID',
};

export const getCommentOperationFields: INodeProperties[] = [
  makeOrganizationUuidField('getComment', 'The organization the ticket belongs to.', 'ticketComment'),
  makeTicketIdField('getComment', 'The numeric ID of the ticket containing the comment', 'ticketComment'),
  {
    displayName: 'Comment ID',
    name: 'commentId',
    type: 'number',
    required: true,
    default: 0,
    description: 'The numeric ID of the comment to retrieve',
    displayOptions: { show: { resource: ['ticketComment'], operation: ['getComment'] } },
  },
];
