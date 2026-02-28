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

  if (
    lower.includes('forbidden') ||
    lower.includes('unauthor') ||
    lower.includes('permission')
  ) {
    return {
      error: true,
      errorType: 'PERMISSION_DENIED',
      message,
      operation: buildOperation(resource, operation),
      nextAction: 'Verify API credentials and permissions, then retry.',
    };
  }
  if (lower.includes('not found') || lower.includes('does not exist') || lower.includes('not_found')) {
    return {
      error: true,
      errorType: 'ENTITY_NOT_FOUND',
      message,
      operation: buildOperation(resource, operation),
      nextAction: `Use ticket_getMany or organization_getMany to find the correct ID, then retry.`,
    };
  }
  if (
    lower.includes('required') ||
    lower.includes('missing') ||
    lower.includes('invalid_request')
  ) {
    return {
      error: true,
      errorType: 'MISSING_REQUIRED_FIELDS',
      message,
      operation: buildOperation(resource, operation),
      nextAction: `Verify all required fields are provided, then retry.`,
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

export function formatIdError(resource: string, operation: string): StructuredToolError {
  return {
    error: true,
    errorType: 'MISSING_ENTITY_ID',
    message: `A numeric entity ID is required for ${buildOperation(resource, operation)}.`,
    operation: buildOperation(resource, operation),
    nextAction: `Use ticket_getMany to locate the correct ticket ID first.`,
  };
}
