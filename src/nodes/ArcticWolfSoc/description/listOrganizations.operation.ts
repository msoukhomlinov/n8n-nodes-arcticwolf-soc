import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const getManyOrganizationsOperationOption: INodePropertyOptions = {
  name: 'Get Many',
  value: 'getMany',
  action: 'Get many organizations',
  description: 'Retrieve all organizations accessible with the current credentials',
};

export const getManyOrganizationsOperationFields: INodeProperties[] = [
  {
    displayName: 'Filters',
    name: 'filters',
    type: 'collection',
    placeholder: 'Add Filter',
    default: {},
    displayOptions: {
      show: {
        resource: ['organization'],
        operation: ['getMany'],
      },
    },
    options: [
      {
        displayName: 'Root Organization ID',
        name: 'root',
        type: 'string',
        default: '',
        placeholder: 'e.g. 422dbd5b-68fa-48d7-ac0f-4e42bc73a40a',
        hint: 'Leave blank to return all organizations accessible with the current credentials.',
        description:
          'Filter results to organizations under this parent organization UUID. ' +
          'Use the <code>id</code> field from a previous Get Many Organizations call.',
      },
    ],
  },
];
