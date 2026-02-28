import { NodeOperationError } from 'n8n-workflow';
import type {
  NodeConnectionType,
  IDataObject,
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeType,
  INodeTypeDescription,
  INodePropertyOptions,
  INodeExecutionData,
  ISupplyDataFunctions,
  SupplyData,
} from 'n8n-workflow';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { normaliseToolInputSchema } from './ai-tools/schema-normalizer.js';
import { executeBoilerplateTool } from './ai-tools/tool-executor.js';
import {
  getEchoSchema,
  getGetSchema,
  getGetManySchema,
  getCreateSchema,
  getUpdateSchema,
  getDeleteSchema,
} from './ai-tools/schema-generator.js';
import {
  buildEchoDescription,
  buildGetDescription,
  buildGetManyDescription,
  buildCreateDescription,
  buildUpdateDescription,
  buildDeleteDescription,
} from './ai-tools/description-builders.js';

// ---------------------------------------------------------------------------
// Build a toolkit class the n8n AI Agent recognises via instanceof check.
//
// The AI Agent checks: if (toolOrToolkit instanceof Toolkit)
// using Toolkit from @langchain/classic/agents — NOT n8n-core's StructuredToolkit.
// Community nodes share n8n's require VM context so require('@langchain/classic/agents')
// resolves the same cached module the agent uses, making instanceof work correctly.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { Toolkit: LangChainToolkitBase } = require('@langchain/classic/agents') as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Toolkit: new (...args: any[]) => { tools?: DynamicStructuredTool[]; getTools?(): DynamicStructuredTool[] };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class BoilerplateToolkit extends (LangChainToolkitBase as any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare tools: any[];
  constructor(toolList: DynamicStructuredTool[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super();
    this.tools = toolList;
  }
  getTools(): DynamicStructuredTool[] {
    return this.tools as DynamicStructuredTool[];
  }
}

const WRITE_OPERATIONS = ['create', 'update', 'delete'];

const RESOURCE_OPERATIONS: Record<string, string[]> = {
  boilerplate: ['echo', 'get', 'getMany', 'create', 'update', 'delete'],
};

const OP_LABELS: Record<string, string> = {
  echo: 'Echo',
  get: 'Get by ID',
  getMany: 'Get many (with filters)',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
};

function formatResourceName(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export class BoilerplateAiTools implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Boilerplate AI Tools',
    name: 'boilerplateAiTools',
    icon: 'file:boilerplate.svg',
    group: ['output'],
    version: 1,
    description: 'Expose Boilerplate operations as individual AI tools for the AI Agent',
    defaults: { name: 'Boilerplate AI Tools' },
    inputs: [],
    outputs: [{ type: 'ai_tool' as NodeConnectionType, displayName: 'Tools' }],
    credentials: [{ name: 'exampleApi', required: false }],
    properties: [
      {
        displayName: 'Resource Name or ID',
        name: 'resource',
        type: 'options',
        required: true,
        noDataExpression: true,
        typeOptions: { loadOptionsMethod: 'getToolResources' },
        default: '',
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
      },
      {
        displayName: 'Operations Names or IDs',
        name: 'operations',
        type: 'multiOptions',
        required: true,
        typeOptions: {
          loadOptionsMethod: 'getToolResourceOperations',
          loadOptionsDependsOn: ['resource', 'allowWriteOperations'],
        },
        default: [],
        description:
          'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
      },
      {
        displayName: 'Allow Write Operations',
        name: 'allowWriteOperations',
        type: 'boolean',
        default: false,
        description:
          'Whether to enable mutating tools (create, update, delete). When disabled, only read-only operations are exposed.',
      },
    ],
  };

  methods = {
    loadOptions: {
      // eslint-disable-next-line @typescript-eslint/require-await
      async getToolResources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        return Object.keys(RESOURCE_OPERATIONS)
          .map((value) => ({
            name: formatResourceName(value),
            value,
            description: `${formatResourceName(value)} entity`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      async getToolResourceOperations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const resource = this.getCurrentNodeParameter('resource') as string;
        const allowWrite = (this.getCurrentNodeParameter('allowWriteOperations') ?? false) as boolean;
        if (!resource) return [];
        return (RESOURCE_OPERATIONS[resource] ?? [])
          .filter((op) => allowWrite || !WRITE_OPERATIONS.includes(op))
          .map((op) => ({
            name: OP_LABELS[op] ?? op,
            value: op,
            description: `${op} operation`,
          }));
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/require-await
  async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const resource = this.getNodeParameter('resource', itemIndex) as string;
    const operations = this.getNodeParameter('operations', itemIndex) as string[];
    const allowWriteOperations = this.getNodeParameter(
      'allowWriteOperations',
      itemIndex,
      false,
    ) as boolean;

    if (!resource) throw new NodeOperationError(this.getNode(), 'Resource is required');
    if (!operations?.length)
      throw new NodeOperationError(this.getNode(), 'At least one operation must be selected');

    const resourceLabel = formatResourceName(resource);
    const tools: DynamicStructuredTool[] = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const supplyDataContext = this;
    const referenceUtc = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    for (const operation of operations) {
      if (WRITE_OPERATIONS.includes(operation) && !allowWriteOperations) continue;

      const toolName = `${resource}_${operation}`;

      switch (operation) {
        case 'echo':
          tools.push(
            new DynamicStructuredTool({
              name: toolName,
              description: buildEchoDescription(),
              schema: normaliseToolInputSchema(getEchoSchema()),
              func: async (params: Record<string, unknown>) =>
                executeBoilerplateTool(
                  supplyDataContext as unknown as IExecuteFunctions,
                  resource,
                  operation,
                  params,
                ),
            }),
          );
          break;

        case 'get':
          tools.push(
            new DynamicStructuredTool({
              name: toolName,
              description: buildGetDescription(resourceLabel, resource),
              schema: normaliseToolInputSchema(getGetSchema()),
              func: async (params: Record<string, unknown>) =>
                executeBoilerplateTool(
                  supplyDataContext as unknown as IExecuteFunctions,
                  resource,
                  operation,
                  params,
                ),
            }),
          );
          break;

        case 'getMany':
          tools.push(
            new DynamicStructuredTool({
              name: toolName,
              description: buildGetManyDescription(resourceLabel, resource, referenceUtc),
              schema: normaliseToolInputSchema(getGetManySchema()),
              func: async (params: Record<string, unknown>) =>
                executeBoilerplateTool(
                  supplyDataContext as unknown as IExecuteFunctions,
                  resource,
                  operation,
                  params,
                ),
            }),
          );
          break;

        case 'create':
          tools.push(
            new DynamicStructuredTool({
              name: toolName,
              description: buildCreateDescription(resourceLabel, referenceUtc),
              schema: normaliseToolInputSchema(getCreateSchema()),
              func: async (params: Record<string, unknown>) =>
                executeBoilerplateTool(
                  supplyDataContext as unknown as IExecuteFunctions,
                  resource,
                  operation,
                  params,
                ),
            }),
          );
          break;

        case 'update':
          tools.push(
            new DynamicStructuredTool({
              name: toolName,
              description: buildUpdateDescription(resourceLabel, referenceUtc),
              schema: normaliseToolInputSchema(getUpdateSchema()),
              func: async (params: Record<string, unknown>) =>
                executeBoilerplateTool(
                  supplyDataContext as unknown as IExecuteFunctions,
                  resource,
                  operation,
                  params,
                ),
            }),
          );
          break;

        case 'delete':
          tools.push(
            new DynamicStructuredTool({
              name: toolName,
              description: buildDeleteDescription(resourceLabel),
              schema: normaliseToolInputSchema(getDeleteSchema()),
              func: async (params: Record<string, unknown>) =>
                executeBoilerplateTool(
                  supplyDataContext as unknown as IExecuteFunctions,
                  resource,
                  operation,
                  params,
                ),
            }),
          );
          break;

        default:
          break;
      }
    }

    if (tools.length === 0) {
      throw new NodeOperationError(
        this.getNode(),
        'No tools to expose. Select operations and enable "Allow Write Operations" if needed.',
      );
    }

    const toolkit = new BoilerplateToolkit(tools);
    return { response: toolkit };
  }

  /**
   * execute() stub required for n8n 2.8+.
   * Without this, "Test step" in the editor falls through to the declarative
   * RoutingNode path and throws ERR_INVALID_URL (no requestDefaults configured).
   * AI Agent tool invocations go through supplyData → DynamicStructuredTool.func only.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const resource = this.getNodeParameter('resource', 0, '') as string;
    const operations = this.getNodeParameter('operations', 0, []) as string[];
    return [
      [
        {
          json: {
            message:
              'This is an AI Tool node. Connect it to an AI Agent node to use it.',
            configured: { resource, operations },
          } as IDataObject,
          pairedItem: { item: 0 },
        },
      ],
    ];
  }
}
