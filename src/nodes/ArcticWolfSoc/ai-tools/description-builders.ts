/** Inject current UTC so the LLM doesn't assume training cutoff = now */
export function dateTimeReferenceSnippet(referenceUtc: string): string {
  return `Reference: current UTC when these tools were loaded is ${referenceUtc}. Use this for "today" or "recent" queries — do not assume a different date. `;
}

// Unified description builder — composes per-operation guidance into one string
// for the single unified tool per resource

export function buildUnifiedDescription(
  resourceLabel: string,
  resource: string,
  operations: string[],
  referenceUtc: string,
): string {
  const enabledOps = Array.from(new Set(operations));

  const operationLines = enabledOps.map((operation) => {
    switch (`${resource}.${operation}`) {
      case 'ticket.getMany':
        return (
          `- getMany: Fetch live tickets. ` +
          `${dateTimeReferenceSnippet(referenceUtc)}` +
          `Returns { results: Ticket[], meta: { total, offset, limit } }. ` +
          `Filters: status (array), priority, type, assigneeByEmail/FirstName/LastName, updatedAfter/Before, createdAfter/Before, limit (default 20, max 100), offset. ` +
          `Call arcticwolfsoc_organization with operation 'getMany' first if organizationUuid is unknown.`
        );
      case 'ticket.getTicket':
        return (
          `- getTicket: Fetch a single ticket by numeric ticketId. ` +
          `ONLY use when you already have the ticketId from a prior getMany. Returns full Ticket object.`
        );
      case 'ticket.closeTicket':
        return (
          `- closeTicket: Close a ticket. PREREQUISITE: numeric ticketId (from getMany). ` +
          `Optional comment field. Returns updated Ticket with status=CLOSED.`
        );
      case 'ticketComment.getMany':
        return (
          `- getMany: List all comments on a ticket. ` +
          `Returns Comment[]: id, body, author.{firstName, lastName, email}, createdAt. ` +
          `Call arcticwolfsoc_ticket with operation 'getMany' first if ticketId is unknown.`
        );
      case 'ticketComment.getComment':
        return (
          `- getComment: Fetch one comment by numeric commentId. ` +
          `ONLY use when you already have the commentId from a prior getMany. Returns Comment object.`
        );
      case 'ticketComment.addComment':
        return (
          `- addComment: Post a new comment to a ticket. ` +
          `Required: body (plain text, max 65535 chars). PREREQUISITE: numeric ticketId.`
        );
      case 'organization.getMany':
        return (
          `- getMany: List all Arctic Wolf organizations. ` +
          `Returns array of { id (UUID), customerID, name, pod }. ` +
          `Always call this first when organizationUuid is unknown — never guess the UUID. ` +
          `Call with NO arguments to get the full list, then match by name or customerID.`
        );
      default:
        return `- ${operation}: Operation available for this resource.`;
    }
  });

  return [
    `Manage Arctic Wolf ${resourceLabel} records via the API.`,
    `Pass one of the following values in the required "operation" field:`,
    ...operationLines,
    `Prefer running getMany first to discover IDs before using get, close, or write operations.`,
  ].join('\n');
}
