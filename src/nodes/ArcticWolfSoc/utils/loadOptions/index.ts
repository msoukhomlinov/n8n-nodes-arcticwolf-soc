import type { ILoadOptionsFunctions, INodePropertyOptions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Load the list of accessible organizations from the Arctic Wolf Organizations API.
 * Used by organizationUuid fields as typeOptions.loadOptionsMethod: 'getOrganizations'.
 */
export async function getOrganizations(
  this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
  const baseUrl = 'https://eloc.global-prod.arcticwolf.net';
  try {
    const response = (await this.helpers.requestWithAuthentication.call(this, 'arcticWolfSocApi', {
      method: 'GET',
      url: `${baseUrl}/api/v1/organizations`,
      json: true,
    })) as JsonObject | JsonObject[];

    const orgs = Array.isArray(response) ? response : [];
    return orgs.map((org) => ({
      name: String(org['name'] ?? org['id']),
      value: String(org['id']),
    }));
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}
