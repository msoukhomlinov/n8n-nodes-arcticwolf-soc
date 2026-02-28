import type { INodeProperties } from 'n8n-workflow';
import { echoOperationOption, echoOperationFields } from './echo.operation.js';

export const boilerplateNodeProperties: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    options: [echoOperationOption],
    default: 'echo',
  },
  {
    displayName: 'Sample Option (loaded)',
    name: 'sample',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'getSampleOptions',
    },
    default: 'a',
    description: 'Example field populated via loadOptions',
    displayOptions: {
      show: {
        operation: ['echo'],
      },
    },
  },
  ...echoOperationFields,
];


