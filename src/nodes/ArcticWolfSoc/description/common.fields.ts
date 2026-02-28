import type { INodeProperties } from 'n8n-workflow';

const EXPRESSIONS_LINK =
  '<a href="https://docs.n8n.io/code/expressions/">expression</a>';

/**
 * Organization UUID field for ticket operations.
 * @param operation  The operation value used in displayOptions.show
 * @param description  Leading sentence describing what the org is for (no trailing space needed)
 */
export function makeOrganizationUuidField(operation: string, description: string): INodeProperties {
  return {
    displayName: 'Organization Name or ID',
    name: 'organizationUuid',
    type: 'options',
    required: true,
    typeOptions: { loadOptionsMethod: 'getOrganizations' },
    default: '',
    description: `${description} Choose from the list, or specify an ID using an ${EXPRESSIONS_LINK}.`,
    displayOptions: { show: { resource: ['ticket'], operation: [operation] } },
  };
}

/**
 * Ticket ID field for ticket operations.
 * @param operation  The operation value used in displayOptions.show
 * @param description  Description of what the ticket ID is used for
 */
export function makeTicketIdField(operation: string, description: string): INodeProperties {
  return {
    displayName: 'Ticket ID',
    name: 'ticketId',
    type: 'number',
    required: true,
    default: 0,
    description,
    displayOptions: { show: { resource: ['ticket'], operation: [operation] } },
  };
}

