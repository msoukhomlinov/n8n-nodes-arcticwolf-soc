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
import { executeArcticWolfSocTool } from './ai-tools/tool-executor.js';
import { buildUnifiedDescription } from './ai-tools/description-builders.js';
import { getRuntimeSchemaBuilders } from './ai-tools/schema-generator.js';
import { RuntimeDynamicStructuredTool, runtimeZod } from './ai-tools/runtime.js';
import { wrapError, ERROR_TYPES } from './ai-tools/error-formatter.js';
import { WRITE_OPERATIONS } from './constants.js';
import { RESOURCE_OPERATIONS, OP_LABELS } from './operations.registry.js';

// Initialise runtime schema builders once at module load so runtimeZod is
// resolved before any node instance is created.
const runtimeSchemas = getRuntimeSchemaBuilders(runtimeZod);

// MCP annotations per operation — future-ready for when DynamicStructuredTool accepts them.
export const MCP_ANNOTATIONS_BY_OPERATION: Record<
  string,
  {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  }
> = {
  getMany: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  getTicket: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  getComment: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  closeTicket: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  addComment: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
};

function computeMcpAnnotations(enabledOperations: string[]) {
  return {
    readOnlyHint: enabledOperations.every(
      (op) => MCP_ANNOTATIONS_BY_OPERATION[op]?.readOnlyHint ?? true,
    ),
    destructiveHint: enabledOperations.some(
      (op) => MCP_ANNOTATIONS_BY_OPERATION[op]?.destructiveHint ?? false,
    ),
    idempotentHint: enabledOperations.every(
      (op) => MCP_ANNOTATIONS_BY_OPERATION[op]?.idempotentHint ?? false,
    ),
    openWorldHint: enabledOperations.some(
      (op) => MCP_ANNOTATIONS_BY_OPERATION[op]?.openWorldHint ?? false,
    ),
  };
}

export class ArcticWolfSocAiTools implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Arctic Wolf SOC AI Tools',
    name: 'arcticWolfSocAiTools',
    icon: 'file:arcticwolfsoc.svg',
    group: ['output'],
    version: 1,
    description: 'Expose Arctic Wolf SOC operations as AI tools for the AI Agent',
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
        return Object.entries(RESOURCE_OPERATIONS)
          .map(([value, config]) => ({
            name: config.label,
            value,
            description: `${config.label} resource`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      async getToolResourceOperations(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const resource = this.getCurrentNodeParameter('resource') as string;
        const allowWrite = (this.getCurrentNodeParameter('allowWriteOperations') ??
          false) as boolean;
        if (!resource) return [];
        const config = RESOURCE_OPERATIONS[resource];
        if (!config) return [];
        return config.ops
          .filter((op) => allowWrite || !WRITE_OPERATIONS.includes(op))
          .map((op) => ({
            name: OP_LABELS[op] ?? op,
            value: op,
            description: `${op} operation for ${config.label}`,
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

    const config = RESOURCE_OPERATIONS[resource];
    if (!config) throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);

    const enabledOperations = operations.filter((op) => {
      if (WRITE_OPERATIONS.includes(op) && !allowWriteOperations) return false;
      return config.ops.includes(op);
    });

    if (enabledOperations.length === 0) {
      throw new NodeOperationError(
        this.getNode(),
        'No tools to expose. Select operations and enable "Allow Write Operations" if needed.',
      );
    }

    const credentials = await this.getCredentials('arcticWolfSocApi');
    const region = credentials['region'] as string;
    const referenceUtc = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    const unifiedSchema = runtimeSchemas.buildUnifiedSchema(resource, enabledOperations);
    const unifiedDescription = buildUnifiedDescription(
      config.label,
      resource,
      enabledOperations,
      referenceUtc,
    );

    // Aggregate MCP annotations from enabled operations (future-ready).
    // DynamicStructuredTool doesn't accept annotations yet; when it does,
    // pass mcpAnnotations into the constructor.
    void computeMcpAnnotations(enabledOperations);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const supplyDataContext = this;

    const unifiedTool = new RuntimeDynamicStructuredTool({
      name: `arcticwolfsoc_${resource}`,
      description: unifiedDescription,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      schema: unifiedSchema as any,
      func: async (params: Record<string, unknown>) => {
        // MCP Trigger path: operation comes from params
        const operationFromArgs = params['operation'];
        const op = typeof operationFromArgs === 'string' ? operationFromArgs : undefined;

        // Layer 2: write operation guard in func() path
        if (op && WRITE_OPERATIONS.includes(op) && !allowWriteOperations) {
          return JSON.stringify(
            wrapError(
              resource,
              op,
              ERROR_TYPES.WRITE_OPERATION_BLOCKED,
              `Write operation '${op}' is not allowed. Enable "Allow Write Operations" in the node configuration.`,
              'Enable "Allow Write Operations" in the node configuration, then retry.',
            ),
          );
        }

        if (!op || !enabledOperations.includes(op)) {
          return JSON.stringify(
            wrapError(
              resource,
              op ?? 'unknown',
              ERROR_TYPES.INVALID_OPERATION,
              'Missing or unsupported operation for this tool call.',
              'Use one of the allowed operations: ' + enabledOperations.join(', '),
              {
                providedOperation: operationFromArgs ?? null,
                allowedOperations: enabledOperations,
              },
            ),
          );
        }
        // Pass params directly — N8N_METADATA_FIELDS in the executor strips 'operation'
        // (and other framework fields) before any API call.
        return executeArcticWolfSocTool(
          supplyDataContext as unknown as IExecuteFunctions,
          resource,
          op,
          params,
          region,
        );
      },
    });

    return { response: unifiedTool };
  }

  /**
   * execute() is called by n8n for both "Test step" clicks and AI Agent tool invocations.
   *
   * AI Agent path: item.json contains tool call metadata plus LLM-provided parameters.
   * The 'tool' field is set to `arcticwolfsoc_${resource}`; 'operation' is the LLM-chosen op.
   *
   * Test step (no tool field): return an informational stub.
   */
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const resource = this.getNodeParameter('resource', 0, '') as string;
    const operations = this.getNodeParameter('operations', 0, []) as string[];
    const allowWriteOperations = this.getNodeParameter('allowWriteOperations', 0, false) as boolean;

    const items = this.getInputData();
    const firstItemTool = items[0]?.json?.['tool'] as string | undefined;

    // No tool field → "Test step" click, not a real AI Agent tool call
    if (!firstItemTool) {
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

    if (!resource || !operations?.length) {
      throw new NodeOperationError(
        this.getNode(),
        'Resource and at least one operation must be configured.',
      );
    }

    const config = RESOURCE_OPERATIONS[resource];
    if (!config) throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);

    const effectiveOps = operations.filter(
      (op) => !WRITE_OPERATIONS.includes(op) || allowWriteOperations,
    );
    if (effectiveOps.length === 0) {
      throw new NodeOperationError(
        this.getNode(),
        'No permitted operations. Enable "Allow Write Operations" if needed.',
      );
    }

    const credentials = await this.getCredentials('arcticWolfSocApi');
    const region = credentials['region'] as string;

    const returnData: INodeExecutionData[] = [];
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex];
      if (!item) continue;

      // Unified tool: operation comes from item.json.operation (set by AI Agent)
      const requestedOp = item.json['operation'] as string | undefined;

      // Layer 2: write operation guard in execute() path
      if (requestedOp && WRITE_OPERATIONS.includes(requestedOp) && !allowWriteOperations) {
        const envelope = wrapError(
          resource,
          requestedOp,
          ERROR_TYPES.WRITE_OPERATION_BLOCKED,
          `Write operation '${requestedOp}' is not allowed. Enable "Allow Write Operations" in the node configuration.`,
          'Enable "Allow Write Operations" in the node configuration, then retry.',
        );
        returnData.push({
          json: envelope as unknown as IDataObject,
          pairedItem: { item: itemIndex },
        });
        continue;
      }

      if (!requestedOp || !effectiveOps.includes(requestedOp)) {
        const envelope = wrapError(
          resource,
          requestedOp ?? 'unknown',
          ERROR_TYPES.INVALID_OPERATION,
          'Missing or unsupported operation for this tool call.',
          'Use one of the allowed operations: ' + effectiveOps.join(', '),
          { providedOperation: requestedOp ?? null, allowedOperations: effectiveOps },
        );
        returnData.push({
          json: envelope as unknown as IDataObject,
          pairedItem: { item: itemIndex },
        });
        continue;
      }

      try {
        const rawParams = item.json as Record<string, unknown>;
        const resultStr = await executeArcticWolfSocTool(
          this,
          resource,
          requestedOp,
          rawParams,
          region,
        );
        returnData.push({
          json: JSON.parse(resultStr) as IDataObject,
          pairedItem: { item: itemIndex },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          const msg = error instanceof Error ? error.message : String(error);
          returnData.push({ json: { error: msg } as IDataObject, pairedItem: { item: itemIndex } });
        } else {
          throw error;
        }
      }
    }
    return [returnData];
  }
}
