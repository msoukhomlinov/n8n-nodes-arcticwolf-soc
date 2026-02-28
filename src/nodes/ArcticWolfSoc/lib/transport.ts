import type { IExecuteFunctions, IHttpRequestOptions, IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { CREDENTIAL_NAME, ORGS_API_BASE_URL, TICKET_API_URL_TEMPLATE } from '../constants.js';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Returns the base URL for the Arctic Wolf Ticket API for a given region.
 */
export function getTicketApiBaseUrl(region: string): string {
  return TICKET_API_URL_TEMPLATE.replace('{region}', region);
}

/**
 * Returns the base URL for the Arctic Wolf Organizations API (global).
 */
export function getOrgsApiBaseUrl(): string {
  return ORGS_API_BASE_URL;
}

/**
 * Generic HTTP request helper for the Arctic Wolf SOC node.
 * Uses n8n's authenticated HTTP helper with the arcticWolfSocApi credential.
 */
export async function requestArcticWolfSoc(
  this: IExecuteFunctions,
  method: HttpMethod,
  baseUrl: string,
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
    url: baseUrl + endpoint,
    headers,
    qs,
    body,
    returnFullResponse: false,
    json: true,
  };

  try {
    return (await this.helpers.requestWithAuthentication.call(
      this,
      CREDENTIAL_NAME,
      options,
    )) as JsonObject;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}
