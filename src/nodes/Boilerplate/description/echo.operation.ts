import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

// Operation entry for the selector
export const echoOperationOption: INodePropertyOptions = {
  name: 'Echo',
  value: 'echo',
  description: 'Return the input data as-is',
  action: 'Echo input',
};

// Fields specific to the echo operation
export const echoOperationFields: INodeProperties[] = [
  {
    displayName: 'Message',
    name: 'message',
    type: 'string',
    default: 'Hello from Boilerplate node',
    description: 'Optional message to include in the output',
    displayOptions: {
      show: {
        operation: ['echo'],
      },
    },
  },
];


