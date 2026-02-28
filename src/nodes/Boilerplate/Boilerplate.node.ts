import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { boilerplateNodeProperties } from './index.js';
import * as loadOptions from './utils/loadOptions/index.js';

export class Boilerplate implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Boilerplate',
    name: 'boilerplate',
    group: ['transform'],
    version: 1,
    description: 'A minimal boilerplate community node',
    subtitle: '={{$parameter["operation"]}}',
    defaults: {
      name: 'Boilerplate',
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    icon: 'file:boilerplate.svg',
    usableAsTool: true,
    credentials: [
      {
        name: 'exampleApi',
        required: false,
      },
    ],
    properties: boilerplateNodeProperties,
  };

  methods = {
    loadOptions: {
      // re-expose load options for use in description via typeOptions.loadOptionsMethod
      getSampleOptions: loadOptions.getSampleOptions,
    },
  };

  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const operation = this.getNodeParameter('operation', itemIndex);
        if (operation === 'echo') {
          const message = this.getNodeParameter('message', itemIndex) as string;
          // Deep clone the input JSON data to avoid mutating the original
          const inputJson = items[itemIndex].json ?? {};
          const clonedJson = JSON.parse(JSON.stringify(inputJson)) as IDataObject;
          const data: IDataObject = {
            ...clonedJson,
            message,
          };
          // Preserve binary data if it exists
          const returnItem: INodeExecutionData = {
            json: data,
            pairedItem: { item: itemIndex },
          };
          if (items[itemIndex].binary) {
            returnItem.binary = items[itemIndex].binary;
          }
          returnData.push(returnItem);
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: itemIndex } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
