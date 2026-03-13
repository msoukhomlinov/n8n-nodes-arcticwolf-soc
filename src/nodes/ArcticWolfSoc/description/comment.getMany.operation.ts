import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { makeOrganizationUuidField, makeTicketIdField } from './common.fields.js';

export const getManyCommentsOperationOption: INodePropertyOptions = {
  name: 'Get Many',
  value: 'getMany',
  action: 'Get all comments for a ticket',
  description: 'Retrieve all comments for a specific ticket as individual items',
};

export const getManyCommentsOperationFields: INodeProperties[] = [
  makeOrganizationUuidField('getMany', 'The organization the ticket belongs to.', 'ticketComment'),
  makeTicketIdField(
    'getMany',
    'The numeric ID of the ticket to retrieve comments for',
    'ticketComment',
  ),
];
