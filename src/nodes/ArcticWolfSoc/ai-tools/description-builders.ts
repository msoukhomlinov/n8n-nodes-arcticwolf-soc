/** Inject current UTC so the LLM doesn't assume training cutoff = now */
export function dateTimeReferenceSnippet(referenceUtc: string): string {
  return `Reference: current UTC when these tools were loaded is ${referenceUtc}. Use this for "today" or "recent" queries — do not assume a different date. `;
}

export function buildGetManyTicketsDescription(referenceUtc: string): string {
  return (
    dateTimeReferenceSnippet(referenceUtc) +
    'Get many tickets for an Arctic Wolf organization. ' +
    'Filter by status (OPEN, NEW, PENDING, HOLD, CLOSED), priority (LOW, NORMAL, HIGH, URGENT), ' +
    'type (QUESTION, INCIDENT, PROBLEM, TASK), assignee email, assignee first name, assignee last name, or date ranges. ' +
    'Date-time fields must be ISO 8601 format (e.g. "2024-01-15T00:00:00Z"). ' +
    'Use limit (max 100) and offset for pagination. ' +
    'Set includeComments=true to retrieve comments alongside ticket data.'
  );
}

export function buildGetTicketDescription(): string {
  return (
    'Retrieve a single Arctic Wolf ticket by its numeric ID within an organization. ' +
    'Use ticket_getMany to find ticket IDs if unknown. ' +
    'Set includeComments=true to include the comment thread.'
  );
}

export function buildCloseTicketDescription(): string {
  return (
    'Close an Arctic Wolf ticket by its numeric ID. ' +
    'Optionally provide a comment to explain the closure reason. ' +
    'Use ticket_getTicket to verify the ticket is in a closeable state first.'
  );
}

export function buildAddCommentDescription(): string {
  return (
    'Add a comment to an existing Arctic Wolf ticket. ' +
    'The comment text is required (max 65535 characters). ' +
    'Use ticket_getMany or ticket_getTicket to find the correct ticket ID first.'
  );
}

export function buildGetManyOrganizationsDescription(): string {
  return (
    'Get all Arctic Wolf organizations accessible with the current credentials. ' +
    'Each result contains: id (UUID — use as organizationUuid in ticket operations), ' +
    'customerID (short directory slug, e.g. "firefly"), ' +
    'name (display name), and pod (region identifier, e.g. "us001"). ' +
    'Optionally filter results by supplying a root organization UUID to scope to child organizations. ' +
    'Call this first when the organizationUuid is unknown.'
  );
}
