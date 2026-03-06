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
];
