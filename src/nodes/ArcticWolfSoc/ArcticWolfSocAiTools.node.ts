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
import { executeArcticWolfSocTool } from './ai-tools/tool-executor.js';
import { WRITE_OPERATIONS } from './constants.js';
import { RESOURCE_OPERATIONS, OP_LABELS, OPERATION_REGISTRY } from './operations.registry.js';

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
class ArcticWolfSocToolkit extends (LangChainToolkitBase as any) {
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

function formatResourceName(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export class ArcticWolfSocAiTools implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Arctic Wolf SOC AI Tools',
    name: 'arcticWolfSocAiTools',
    icon: 'file:arcticwolfsoc.svg',
    group: ['output'],
    version: 1,
    description: 'Expose Arctic Wolf SOC operations as individual AI tools for the AI Agent',
    defaults: { name: 'Arctic Wolf SOC AI Tools' },
    inputs: [],
    outputs: [{ type: 'ai_tool' as NodeConnectionType, displayName: 'Tools' }],
    credentials: [{ name: 'arcticWolfSocApi', required: true }],
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
          'Whether to enable mutating tools (closeTicket, addComment). When disabled, only read-only operations are exposed.',
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

    const credentials = await this.getCredentials('arcticWolfSocApi');
    const region = credentials['region'] as string;

    const tools: DynamicStructuredTool[] = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const supplyDataContext = this;
    const referenceUtc = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    for (const operation of operations) {
      if (WRITE_OPERATIONS.includes(operation) && !allowWriteOperations) continue;
      const reg = OPERATION_REGISTRY[resource]?.[operation];
      if (!reg) continue;
      tools.push(
        new DynamicStructuredTool({
          name: `${resource}_${operation}`,
          description: reg.buildDescription(referenceUtc),
          schema: normaliseToolInputSchema(reg.getSchema()),
          func: async (params: Record<string, unknown>) =>
            executeArcticWolfSocTool(
              supplyDataContext as unknown as IExecuteFunctions,
              resource,
              operation,
              params,
              region,
            ),
        }),
      );
    }

    if (tools.length === 0) {
      throw new NodeOperationError(
        this.getNode(),
        'No tools to expose. Select operations and enable "Allow Write Operations" if needed.',
      );
    }

    const toolkit = new ArcticWolfSocToolkit(tools);
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
            message: 'This is an AI Tool node. Connect it to an AI Agent node to use it.',
            configured: { resource, operations },
          } as IDataObject,
          pairedItem: { item: 0 },
        },
      ],
    ];
  }
}
