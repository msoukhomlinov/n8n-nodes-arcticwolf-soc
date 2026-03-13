import type { ICredentialType, INodeProperties } from 'n8n-workflow';
import { REGIONS } from '../nodes/ArcticWolfSoc/constants.js';

export class ArcticWolfApi implements ICredentialType {
  name = 'arcticWolfSocApi';
  displayName = 'Arctic Wolf SOC API';
  documentationUrl =
    'https://docs.arcticwolf.com/bundle/unlisted_documentation/page/ticket_api_quick_start_guide.html';
  properties: INodeProperties[] = [
    {
      displayName: 'Bearer Token',
      name: 'token',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'The Bearer token for authentication with the Arctic Wolf API',
    },
    {
      displayName: 'Region',
      name: 'region',
      type: 'options',
      options: [...REGIONS],
      default: 'us001',
      required: true,
      description: 'The Arctic Wolf region your account is hosted in',
    },
  ];

  authenticate = {
    type: 'generic' as const,
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.token}}',
      },
    },
  };

  // Credential test stub — uncomment and configure when a suitable test endpoint is identified
  // test = {
  //   request: {
  //     method: 'GET' as const,
  //     url: 'https://eloc.global-prod.arcticwolf.net/api/v1/organizations',
  //   },
  // };
}
