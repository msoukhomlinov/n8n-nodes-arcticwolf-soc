export interface ToolEnvelope {
  schemaVersion: string;
  success: boolean;
  operation: string;
  resource: string;
}

export interface SuccessEnvelope extends ToolEnvelope {
  success: true;
  result: unknown;
}

export interface ErrorEnvelope extends ToolEnvelope {
  success: false;
  error: {
    errorType: string;
    message: string;
    nextAction: string;
    context?: Record<string, unknown>;
  };
}

export const ERROR_TYPES = {
  API_ERROR: 'API_ERROR',
  ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
  NO_RESULTS_FOUND: 'NO_RESULTS_FOUND',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  MISSING_ENTITY_ID: 'MISSING_ENTITY_ID',
  INVALID_OPERATION: 'INVALID_OPERATION',
  WRITE_OPERATION_BLOCKED: 'WRITE_OPERATION_BLOCKED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',
  UNSUPPORTED_RESOURCE: 'UNSUPPORTED_RESOURCE',
} as const;

export function wrapSuccess(resource: string, operation: string, result: unknown): SuccessEnvelope {
  return {
    schemaVersion: '1',
    success: true,
    operation: `${resource}.${operation}`,
    resource,
    result,
  };
}

export function wrapError(
  resource: string,
  operation: string,
  errorType: string,
  message: string,
  nextAction: string,
  context?: Record<string, unknown>,
): ErrorEnvelope {
  return {
    schemaVersion: '1',
    success: false,
    operation: `${resource}.${operation}`,
    resource,
    error: {
      errorType,
      message,
      nextAction,
      ...(context ? { context } : {}),
    },
  };
}

export function formatApiError(
  message: string,
  resource: string,
  operation: string,
): ErrorEnvelope {
  const lower = message.toLowerCase();

  if (lower.includes('forbidden') || lower.includes('unauthor') || lower.includes('permission')) {
    return wrapError(
      resource,
      operation,
      ERROR_TYPES.PERMISSION_DENIED,
      message,
      'Verify API credentials and permissions, then retry.',
    );
  }
  if (
    lower.includes('not found') ||
    lower.includes('does not exist') ||
    lower.includes('not_found') ||
    lower.includes('404')
  ) {
    return wrapError(
      resource,
      operation,
      ERROR_TYPES.ENTITY_NOT_FOUND,
      message,
      `Call arcticwolfsoc_ticket with operation 'getMany' or arcticwolfsoc_organization with operation 'getMany' to find the correct ID, then retry.`,
    );
  }
  if (
    lower.includes('validation') ||
    lower.includes('invalid') ||
    lower.includes('unprocessable')
  ) {
    return wrapError(
      resource,
      operation,
      ERROR_TYPES.VALIDATION_ERROR,
      message,
      'Verify parameter values are valid, then retry.',
    );
  }
  if (lower.includes('required') || lower.includes('missing') || lower.includes('invalid_request')) {
    return wrapError(
      resource,
      operation,
      ERROR_TYPES.MISSING_REQUIRED_FIELD,
      message,
      'Verify all required fields are provided, then retry.',
    );
  }
  if (lower.includes('internal_server_error') || lower.includes('internal server error')) {
    return wrapError(
      resource,
      operation,
      ERROR_TYPES.SERVER_ERROR,
      message,
      'Retry the request. If the problem persists, contact Arctic Wolf support.',
    );
  }

  return wrapError(
    resource,
    operation,
    ERROR_TYPES.API_ERROR,
    message,
    'Verify parameter names and values, then retry.',
  );
}

export function formatMissingIdError(resource: string, operation: string): ErrorEnvelope {
  const nextAction =
    resource === 'ticketComment'
      ? `Call arcticwolfsoc_ticket with operation 'getMany' to locate the ticketId, or arcticwolfsoc_ticketComment with operation 'getMany' to locate the commentId.`
      : `Call arcticwolfsoc_ticket with operation 'getMany' to locate the correct ticket ID first.`;
  return wrapError(
    resource,
    operation,
    ERROR_TYPES.MISSING_ENTITY_ID,
    `A numeric entity ID is required for ${resource}.${operation}.`,
    nextAction,
  );
}

export function formatNotFoundError(
  resource: string,
  operation: string,
  entityLabel: string,
): ErrorEnvelope {
  const nextAction =
    resource === 'ticketComment'
      ? `Call arcticwolfsoc_ticketComment with operation 'getMany' to list all comments on the ticket and verify the ID.`
      : `Call arcticwolfsoc_ticket with operation 'getMany' to list tickets and verify the ID, then retry.`;
  return wrapError(
    resource,
    operation,
    ERROR_TYPES.ENTITY_NOT_FOUND,
    `${entityLabel} not found for ${resource}.${operation}.`,
    nextAction,
  );
}

export function formatNoResultsFound(
  resource: string,
  operation: string,
  filters: Record<string, unknown>,
): ErrorEnvelope {
  return wrapError(
    resource,
    operation,
    ERROR_TYPES.NO_RESULTS_FOUND,
    `No ${resource} records matched the provided filters.`,
    'Broaden your search criteria, check for typos, or verify the record exists.',
    { filtersUsed: filters },
  );
}
