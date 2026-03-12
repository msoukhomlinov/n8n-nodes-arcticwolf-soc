/**
 * Resource/operation registry for ArcticWolfSocAiTools.
 *
 * RESOURCE_OPERATIONS drives the loadOptions UI and unified schema/description building.
 * OP_LABELS provides human-readable names for the operations multiOptions selector.
 */

export const RESOURCE_OPERATIONS: Record<string, { label: string; ops: readonly string[] }> = {
  ticket: {
    label: 'Ticket',
    ops: ['getMany', 'getTicket', 'closeTicket'],
  },
  ticketComment: {
    label: 'Ticket Comment',
    ops: ['getMany', 'getComment', 'addComment'],
  },
  organization: {
    label: 'Organization',
    ops: ['getMany'],
  },
};

export const OP_LABELS: Record<string, string> = {
  getMany: 'Get Many',
  getTicket: 'Get Ticket',
  getComment: 'Get Comment',
  closeTicket: 'Close Ticket (write)',
  addComment: 'Add Comment (write)',
};
