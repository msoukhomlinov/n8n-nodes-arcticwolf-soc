/**
 * Builder functions satisfy the `(referenceUtc: string) => string` contract required by
 * `OperationRegistration`. Builders that include time-sensitive guidance call
 * `dateTimeReferenceSnippet(referenceUtc)`. Builders for time-invariant operations accept
 * the parameter but ignore it — TypeScript allows this via parameter arity compatibility.
 */

/** Inject current UTC so the LLM doesn't assume training cutoff = now */
export function dateTimeReferenceSnippet(referenceUtc: string): string {
  return `Reference: current UTC when these tools were loaded is ${referenceUtc}. Use this for "today" or "recent" queries — do not assume a different date. `;
}

export function buildGetManyTicketsDescription(referenceUtc: string): string {
  return (
    dateTimeReferenceSnippet(referenceUtc) +
    'Fetch live ticket data from the Arctic Wolf API. Do not guess or fabricate ticket IDs, titles, or statuses — call this tool to get real data. ' +
    'Returns: { results: Ticket[], meta: { total, offset, limit } }. Each Ticket has: id, title, description, status, priority, type, assignee.{email, firstName, lastName}, createdAt, updatedAt, commentCount. ' +
    'Status semantics: OPEN/NEW/HOLD = with Arctic Wolf team (active work); PENDING = awaiting customer response; CLOSED = resolved. ' +
    'All filters are optional and combined with AND logic. ' +
    'Pagination: default limit=20, max=100. If meta.total > (offset + limit), call again with offset incremented by limit to get the next page. ' +
    'Use organization_getMany first if organizationUuid is unknown. ' +
    'To read comments on a ticket, use ticketComment_getMany.'
  );
}

export function buildGetTicketDescription(): string {
  return (
    'Fetch a single live ticket from the Arctic Wolf API by its numeric ID. Do not fabricate ticket data — call this tool. ' +
    'Returns a Ticket object: id, title, description, status, priority, type, assignee.{email, firstName, lastName}, createdAt, updatedAt, commentCount. ' +
    'Use ticket_getMany to find the ticketId if unknown. ' +
    'Use organization_getMany first if organizationUuid is unknown. ' +
    'To retrieve comments on this ticket, use ticketComment_getMany.'
  );
}

export function buildCloseTicketDescription(): string {
  return (
    'Close a ticket via the Arctic Wolf API. Any ticket can be closed regardless of its current status. ' +
    'Returns the updated Ticket object with status=CLOSED. ' +
    'Optionally provide a comment to explain the closure reason. ' +
    'Use ticket_getMany or ticket_getTicket to confirm the ticketId before closing — do not guess it.'
  );
}

export function buildAddCommentDescription(): string {
  return (
    'Post a new comment to an Arctic Wolf ticket via the API. The comment body is required (plain text, max 65535 characters). ' +
    'Returns the new Comment object: id, body, author.{email, firstName, lastName}, createdAt. ' +
    'Use ticket_getMany or ticket_getTicket to find the ticketId if unknown — do not guess it. ' +
    'Use organization_getMany first if organizationUuid is unknown.'
  );
}

export function buildGetManyCommentsDescription(): string {
  return (
    'Fetch all live comments for a single ticket from the Arctic Wolf API. Do not fabricate comment IDs or content — call this tool. ' +
    'Returns an array of Comment objects, each with: id, body, author.{firstName, lastName, email}, createdAt. ' +
    'To retrieve one specific comment by ID, use ticketComment_getComment. ' +
    'Use ticket_getMany to find the ticketId if unknown.'
  );
}

export function buildGetCommentDescription(): string {
  return (
    'Fetch a single live comment by its numeric ID from the Arctic Wolf API. Do not fabricate comment data — call this tool. ' +
    'Returns: id, body, author.{firstName, lastName, email}, createdAt. ' +
    'Use ticketComment_getMany first to list all comments and find the correct commentId.'
  );
}

export function buildGetManyOrganizationsDescription(): string {
  return (
    'Fetch the live list of Arctic Wolf organizations from the API. ' +
    'Returns a JSON array; each element has: id (UUID string), customerID (short slug), name (display name), pod (region code). ' +
    'You cannot know these values without calling this tool — do not guess or fabricate them. ' +
    'HOW TO FIND AN ORGANIZATION BY NAME OR CUSTOMERID: ' +
    'Step 1 — call this tool with NO arguments. ' +
    'Step 2 — inspect the returned array and find the entry whose name or customerID matches what you are looking for. ' +
    'Step 3 — take that entry\'s id (UUID) and use it as organizationUuid in subsequent ticket operations. ' +
    'The root parameter is for advanced scoping only: it must be a UUID obtained from a prior call to this tool; never set it to a name, slug, or guessed value.'
  );
}
