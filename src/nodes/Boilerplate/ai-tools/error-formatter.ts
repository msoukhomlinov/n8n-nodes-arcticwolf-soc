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
  if (lower.includes('not found') || lower.includes('does not exist')) {
    return {
      error: true,
      errorType: 'ENTITY_NOT_FOUND',
      message,
      operation: buildOperation(resource, operation),
      nextAction: `Use ${resource}_getMany with a filter to find the correct record ID, then retry.`,
    };
  }
  if (lower.includes('required') || lower.includes('missing')) {
    return {
      error: true,
      errorType: 'MISSING_REQUIRED_FIELDS',
      message,
      operation: buildOperation(resource, operation),
      nextAction: `Verify all required fields are provided, then retry.`,
    };
  }
  if (lower.includes('picklist') || lower.includes('invalid value')) {
    return {
      error: true,
      errorType: 'INVALID_PICKLIST_VALUE',
      message,
      operation: buildOperation(resource, operation),
      nextAction: `Verify valid field values, then retry.`,
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
    nextAction: `Use ${resource}_getMany to locate the correct record ID first.`,
  };
}
