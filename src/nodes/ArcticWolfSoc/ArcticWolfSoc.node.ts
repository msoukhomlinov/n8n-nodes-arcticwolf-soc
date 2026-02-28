import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { arcticWolfSocNodeProperties } from './index.js';
import * as loadOptions from './utils/loadOptions/index.js';
import { requestArcticWolfSoc, getTicketApiBaseUrl, getOrgsApiBaseUrl } from './lib/transport.js';
import { buildListTicketsQs } from './lib/params.js';

export class ArcticWolfSoc implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Arctic Wolf SOC',
    name: 'arcticWolfSoc',
    group: ['transform'],
    version: 1,
    description: 'Interact with the Arctic Wolf SOC Ticket API and Organizations API',
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    defaults: {
      name: 'Arctic Wolf SOC',
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    icon: 'file:arcticwolfsoc.svg',
    usableAsTool: true,
    credentials: [
      {
        name: 'arcticWolfSocApi',
        required: true,
      },
    ],
    properties: arcticWolfSocNodeProperties,
  };

  methods = {
    loadOptions: {
      getOrganizations: loadOptions.getOrganizations,
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('arcticWolfSocApi');
    const region = credentials['region'] as string;
    const ticketBaseUrl = getTicketApiBaseUrl(region);
    const orgsBaseUrl = getOrgsApiBaseUrl();

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const resource = this.getNodeParameter('resource', itemIndex);
        const operation = this.getNodeParameter('operation', itemIndex);

        if (resource === 'ticket') {
          if (operation === 'getMany') {
            const organizationUuid = this.getNodeParameter('organizationUuid', itemIndex) as string;
            const returnAll = this.getNodeParameter('returnAll', itemIndex, false);
            const filtersCol = this.getNodeParameter('filters', itemIndex, {} as IDataObject);
            const optionsCol = this.getNodeParameter('options', itemIndex, {} as IDataObject);

            const filterParams = {
              status: Array.isArray(filtersCol['status']) ? (filtersCol['status'] as string[]) : [],
              priority: (filtersCol['priority'] as string) ?? '',
              type: (filtersCol['type'] as string) ?? '',
              assigneeByEmail: (filtersCol['assigneeByEmail'] as string) ?? '',
              assigneeByFirstName: (filtersCol['assigneeByFirstName'] as string) ?? '',
              assigneeByLastName: (filtersCol['assigneeByLastName'] as string) ?? '',
              updatedAfter: (filtersCol['updatedAfter'] as string) ?? '',
              updatedBefore: (filtersCol['updatedBefore'] as string) ?? '',
              createdAfter: (filtersCol['createdAfter'] as string) ?? '',
              createdBefore: (filtersCol['createdBefore'] as string) ?? '',
              includeComments: Boolean(optionsCol['includeComments'] ?? false),
            };

            if (returnAll) {
              const PAGE_SIZE = 100;
              for (let offset = 0; ; offset += PAGE_SIZE) {
                const qs = buildListTicketsQs({ ...filterParams, limit: PAGE_SIZE, offset });
                const result = await requestArcticWolfSoc.call(
                  this,
                  'GET',
                  ticketBaseUrl,
                  `/api/v1/organizations/${organizationUuid}/tickets`,
                  { qs },
                );
                const page = (result as { results?: IDataObject[] })?.results ?? [];
                for (const t of page) returnData.push({ json: t, pairedItem: { item: itemIndex } });
                if (page.length < PAGE_SIZE) break;
              }
            } else {
              const limit = this.getNodeParameter('limit', itemIndex, 50);
              const qs = buildListTicketsQs({ ...filterParams, limit, offset: 0 });
              const result = await requestArcticWolfSoc.call(
                this,
                'GET',
                ticketBaseUrl,
                `/api/v1/organizations/${organizationUuid}/tickets`,
                { qs },
              );
              for (const t of (result as { results?: IDataObject[] })?.results ?? []) {
                returnData.push({ json: t, pairedItem: { item: itemIndex } });
              }
            }
          } else if (operation === 'getTicket') {
            const organizationUuid = this.getNodeParameter('organizationUuid', itemIndex) as string;
            const ticketId = this.getNodeParameter('ticketId', itemIndex) as number;
            const optionsCol = this.getNodeParameter('options', itemIndex, {} as IDataObject);
            const includeComments = Boolean(optionsCol['includeComments'] ?? false);

            const qs: IDataObject = {};
            if (includeComments) qs['includeComments'] = true;

            const result = await requestArcticWolfSoc.call(
              this,
              'GET',
              ticketBaseUrl,
              `/api/v1/organizations/${organizationUuid}/tickets/${ticketId}`,
              { qs },
            );
            returnData.push({ json: result, pairedItem: { item: itemIndex } });
          } else if (operation === 'closeTicket') {
            const organizationUuid = this.getNodeParameter('organizationUuid', itemIndex) as string;
            const ticketId = this.getNodeParameter('ticketId', itemIndex) as number;
            const comment = this.getNodeParameter('comment', itemIndex, '') as string;

            const body: IDataObject = {};
            if (comment) body['comment'] = comment;

            const result = await requestArcticWolfSoc.call(
              this,
              'POST',
              ticketBaseUrl,
              `/api/v1/organizations/${organizationUuid}/tickets/${ticketId}/close`,
              { body },
            );
            returnData.push({ json: result, pairedItem: { item: itemIndex } });
          } else if (operation === 'addComment') {
            const organizationUuid = this.getNodeParameter('organizationUuid', itemIndex) as string;
            const ticketId = this.getNodeParameter('ticketId', itemIndex) as number;
            const commentBody = this.getNodeParameter('body', itemIndex) as string;

            const result = await requestArcticWolfSoc.call(
              this,
              'POST',
              ticketBaseUrl,
              `/api/v1/organizations/${organizationUuid}/tickets/${ticketId}/comments`,
              { body: { body: commentBody } as IDataObject },
            );
            returnData.push({ json: result, pairedItem: { item: itemIndex } });
          } else {
            throw new NodeOperationError(
              this.getNode(),
              `Operation "${operation}" is not yet implemented for resource "${resource}"`,
              { itemIndex },
            );
          }
        } else if (resource === 'organization') {
          if (operation === 'getMany') {
            const filtersCol = this.getNodeParameter('filters', itemIndex, {} as IDataObject);
            const root = (filtersCol['root'] as string) ?? '';

            const qs: IDataObject = {};
            if (root) qs['root'] = root;

            const result = await requestArcticWolfSoc.call(
              this,
              'GET',
              orgsBaseUrl,
              '/api/v1/organizations',
              { qs },
            );
            const orgs = (Array.isArray(result) ? result : [result]) as IDataObject[];
            for (const org of orgs) {
              returnData.push({ json: org, pairedItem: { item: itemIndex } });
            }
          } else {
            throw new NodeOperationError(
              this.getNode(),
              `Operation "${operation}" is not yet implemented for resource "${resource}"`,
              { itemIndex },
            );
          }
        } else {
          throw new NodeOperationError(
            this.getNode(),
            `Resource "${resource}" is not supported`,
            { itemIndex },
          );
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: itemIndex },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
