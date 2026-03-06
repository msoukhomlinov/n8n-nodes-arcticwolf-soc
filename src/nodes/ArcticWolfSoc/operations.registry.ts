import { z } from 'zod';
import {
  getGetManyTicketsSchema,
  getGetTicketSchema,
  getCloseTicketSchema,
  getAddCommentSchema,
  getGetManyCommentsSchema,
  getGetCommentSchema,
  getGetManyOrganizationsSchema,
} from './ai-tools/schema-generator.js';
import {
  buildGetManyTicketsDescription,
  buildGetTicketDescription,
  buildCloseTicketDescription,
  buildAddCommentDescription,
  buildGetManyCommentsDescription,
  buildGetCommentDescription,
  buildGetManyOrganizationsDescription,
} from './ai-tools/description-builders.js';

export const RESOURCE_OPERATIONS: Record<string, readonly string[]> = {
  ticket: ['getMany', 'getTicket', 'closeTicket'],
  ticketComment: ['getMany', 'getComment', 'addComment'],
  organization: ['getMany'],
};

export const OP_LABELS: Record<string, string> = {
  getMany: 'Get Many',
  getTicket: 'Get Ticket',
  getComment: 'Get Comment',
  closeTicket: 'Close Ticket (write)',
  addComment: 'Add Comment (write)',
};

export interface OperationRegistration {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSchema: () => z.ZodObject<any>;
  buildDescription: (referenceUtc: string) => string;
}

export type ResourceOperationRegistry = Record<string, Record<string, OperationRegistration>>;

export const OPERATION_REGISTRY: ResourceOperationRegistry = {
  ticket: {
    getMany: {
      getSchema: getGetManyTicketsSchema,
      buildDescription: buildGetManyTicketsDescription,
    },
    getTicket: {
      getSchema: getGetTicketSchema,
      buildDescription: buildGetTicketDescription,
    },
    closeTicket: {
      getSchema: getCloseTicketSchema,
      buildDescription: buildCloseTicketDescription,
    },
  },
  ticketComment: {
    getMany: {
      getSchema: getGetManyCommentsSchema,
      buildDescription: buildGetManyCommentsDescription,
    },
    getComment: {
      getSchema: getGetCommentSchema,
      buildDescription: buildGetCommentDescription,
    },
    addComment: {
      getSchema: getAddCommentSchema,
      buildDescription: buildAddCommentDescription,
    },
  },
  organization: {
    getMany: {
      getSchema: getGetManyOrganizationsSchema,
      buildDescription: buildGetManyOrganizationsDescription,
    },
  },
};
