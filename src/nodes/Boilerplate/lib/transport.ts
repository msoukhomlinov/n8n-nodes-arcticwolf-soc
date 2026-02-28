import type { IExecuteFunctions, IHttpRequestOptions, IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Generic HTTP request helper for the Boilerplate node.
 * Uses n8n's authenticated HTTP helper with credentials.
 */
export async function requestBoilerplate(
  this: IExecuteFunctions,
  method: HttpMethod,
  endpoint: string,
  {
    body,
    qs,
    headers,
  }: {
    body?: IDataObject;
    qs?: IDataObject;
    headers?: IDataObject;
  } = {},
): Promise<JsonObject> {
  const options: IHttpRequestOptions = {
    method,
    url: endpoint,
    headers,
    qs,
    body,
    returnFullResponse: false,
    json: true,
  };

  try {
    return (await this.helpers.requestWithAuthentication.call(this, 'exampleApi', options)) as JsonObject;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}


