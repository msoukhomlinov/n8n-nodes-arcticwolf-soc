/** Inject current UTC so the LLM doesn't assume training cutoff = now */
export function dateTimeReferenceSnippet(referenceUtc: string): string {
  return `Reference: current UTC when these tools were loaded is ${referenceUtc}. Use this for "today" or "recent" queries — do not assume a different date. `;
}

export function buildEchoDescription(): string {
  return (
    'Echo a message back. Provide a non-empty "message" string. ' +
    'The response contains the echoed message under result.message.'
  );
}

export function buildGetDescription(resourceLabel: string, resourceName: string): string {
  return (
    `Retrieve a single ${resourceLabel} record by numeric ID. ` +
    `Use ${resourceName}_getMany to find a record ID if unknown.`
  );
}

export function buildGetManyDescription(
  resourceLabel: string,
  resourceName: string,
  referenceUtc?: string,
): string {
  const ref = referenceUtc ? dateTimeReferenceSnippet(referenceUtc) : '';
  return (
    ref +
    `Search ${resourceLabel} records with optional filters. ` +
    `Example: filter_field='status', filter_op='eq', filter_value='Open'. ` +
    `Call ${resourceName}_get with a found ID to retrieve full record details.`
  );
}

export function buildCreateDescription(resourceLabel: string, referenceUtc?: string): string {
  const ref = referenceUtc ? dateTimeReferenceSnippet(referenceUtc) : '';
  return (
    ref +
    `Create a new ${resourceLabel} record. ` +
    `Provide all required fields inside "fields". ` +
    `Successful creates return an itemId for follow-up operations.`
  );
}

export function buildUpdateDescription(resourceLabel: string, referenceUtc?: string): string {
  const ref = referenceUtc ? dateTimeReferenceSnippet(referenceUtc) : '';
  return (
    ref +
    `Update an existing ${resourceLabel} record by numeric ID. ` +
    `Only provide fields you want to change inside "fields" — omitted fields are unchanged.`
  );
}

export function buildDeleteDescription(resourceLabel: string): string {
  return (
    `Delete a ${resourceLabel} record by numeric ID. ` +
    `Use getMany or get first to confirm the correct ID before deletion.`
  );
}
