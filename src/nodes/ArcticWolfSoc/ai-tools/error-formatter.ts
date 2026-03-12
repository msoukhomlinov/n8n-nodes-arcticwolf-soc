export interface StructuredToolError {
  error: true;
  errorType: string;
  message: string;
  operation: string;
  nextAction: string;
  context?: Record<string, unknown>;
}

function buildOperation(resource: string, operation: string): string {
  return `${resource}.${operation}`;
}

export function formatApiError(
  message: string,
  resource: string,
  operation: string,
): StructuredToolError {
  const lower = message.toLowerCase();

  if (lower.includes('forbidden') || lower.includes('unauthor') || lower.includes('permission')) {
    return {
      error: true,
      errorType: 'PERMISSION_DENIED',
      message,
      operation: buildOperation(resource, operation),
      nextAction: 'Verify API credentials and permissions, then retry.',
    };
  }
  if (
    lower.includes('not found') ||
    lower.includes('does not exist') ||
    lower.includes('not_found') ||
    lower.includes('404')
  ) {
    return {
      error: true,
      errorType: 'ENTITY_NOT_FOUND',
      message,
      operation: buildOperation(resource, operation),
      nextAction: `Call arcticwolfsoc_ticket with operation 'getMany' or arcticwolfsoc_organization with operation 'getMany' to find the correct ID, then retry.`,
    };
  }
  if (lower.includes('required') || lower.includes('missing') || lower.includes('invalid_request')) {
    return {
      error: true,
      errorType: 'MISSING_REQUIRED_FIELDS',
      message,
      operation: buildOperation(resource, operation),
      nextAction: 'Verify all required fields are provided, then retry.',
    };
  }
  if (lower.includes('internal_server_error') || lower.includes('internal server error')) {
    return {
      error: true,
      errorType: 'SERVER_ERROR',
      message,
      operation: buildOperation(resource, operation),
      nextAction: 'Retry the request. If the problem persists, contact Arctic Wolf support.',
    };
  }

  return {
    error: true,
    errorType: 'API_ERROR',
    message,
    operation: buildOperation(resource, operation),
    nextAction: 'Verify parameter names and values, then retry.',
  };
}

export function formatMissingIdError(resource: string, operation: string): StructuredToolError {
  const nextAction =
    resource === 'ticketComment'
      ? `Call arcticwolfsoc_ticket with operation 'getMany' to locate the ticketId, or arcticwolfsoc_ticketComment with operation 'getMany' to locate the commentId.`
      : `Call arcticwolfsoc_ticket with operation 'getMany' to locate the correct ticket ID first.`;
  return {
    error: true,
    errorType: 'MISSING_ENTITY_ID',
    message: `A numeric entity ID is required for ${buildOperation(resource, operation)}.`,
    operation: buildOperation(resource, operation),
    nextAction,
  };
}

export function formatNotFoundError(
  resource: string,
  operation: string,
  entityLabel: string,
): StructuredToolError {
  const nextAction =
    resource === 'ticketComment'
      ? `Call arcticwolfsoc_ticketComment with operation 'getMany' to list all comments on the ticket and verify the ID.`
      : `Call arcticwolfsoc_ticket with operation 'getMany' to list tickets and verify the ID, then retry.`;
  return {
    error: true,
    errorType: 'ENTITY_NOT_FOUND',
    message: `${entityLabel} not found for ${buildOperation(resource, operation)}.`,
    operation: buildOperation(resource, operation),
    nextAction,
  };
}

export function formatNoResultsFound(
  resource: string,
  operation: string,
  filters: Record<string, unknown>,
): StructuredToolError {
  return {
    error: true,
    errorType: 'NO_RESULTS_FOUND',
    message: `No ${resource} records matched the provided filters.`,
    operation: buildOperation(resource, operation),
    nextAction: 'Broaden your search criteria, check for typos, or verify the record exists.',
    context: { filtersUsed: filters },
  };
}
