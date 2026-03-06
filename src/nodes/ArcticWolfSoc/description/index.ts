import type { INodeProperties } from 'n8n-workflow';
import { getManyTicketsOperationOption, getManyTicketsOperationFields } from './listTickets.operation.js';
import { getTicketOperationOption, getTicketOperationFields } from './getTicket.operation.js';
import { closeTicketOperationOption, closeTicketOperationFields } from './closeTicket.operation.js';
import { addCommentOperationOption, addCommentOperationFields } from './addComment.operation.js';
import { getManyCommentsOperationOption, getManyCommentsOperationFields } from './comment.getMany.operation.js';
import { getCommentOperationOption, getCommentOperationFields } from './comment.getComment.operation.js';
import {
  getManyOrganizationsOperationOption,
  getManyOrganizationsOperationFields,
} from './listOrganizations.operation.js';

export const arcticWolfSocNodeProperties: INodeProperties[] = [
  {
    displayName: 'Resource',
    name: 'resource',
    type: 'options',
    noDataExpression: true,
    options: [
      { name: 'Organization', value: 'organization' },
      { name: 'Ticket', value: 'ticket' },
      { name: 'Ticket Comment', value: 'ticketComment' },
    ],
    default: 'ticket',
  },
  // Ticket operations
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    options: [
      getManyTicketsOperationOption,
      getTicketOperationOption,
      closeTicketOperationOption,
    ],
    default: 'getMany',
    displayOptions: {
      show: {
        resource: ['ticket'],
      },
    },
  },
  // Ticket Comment operations
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    options: [
      getManyCommentsOperationOption,
      getCommentOperationOption,
      addCommentOperationOption,
    ],
    default: 'getMany',
    displayOptions: {
      show: {
        resource: ['ticketComment'],
      },
    },
  },
  // Organization operations
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    options: [getManyOrganizationsOperationOption],
    default: 'getMany',
    displayOptions: {
      show: {
        resource: ['organization'],
      },
    },
  },
  // Ticket operation fields
  ...getManyTicketsOperationFields,
  ...getTicketOperationFields,
  ...closeTicketOperationFields,
  // Ticket Comment operation fields
  ...getManyCommentsOperationFields,
  ...getCommentOperationFields,
  ...addCommentOperationFields,
  // Organization operation fields
  ...getManyOrganizationsOperationFields,
];
