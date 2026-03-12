// nodes/ArcticWolfSoc/ai-tools/runtime.ts
//
// Resolves DynamicStructuredTool and zod from n8n's module tree so that
// instanceof checks pass at runtime. Community nodes bundle their own copies of
// these packages; n8n loads its own copies. JavaScript instanceof fails across
// module copies, so we must use the same instances n8n uses.
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { z as ZodNamespace } from 'zod';

type DynamicStructuredToolCtor = new (fields: {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  func: (params: Record<string, unknown>) => Promise<string>;
}) => DynamicStructuredTool;

export type RuntimeZod = typeof ZodNamespace;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRuntimeRequire(): any {
  // Anchor: @langchain/classic/agents — always present in n8n's dependency tree.
  // NOTE: if n8n drops @langchain/classic in a future version, update this anchor
  // to another package in n8n's tree that depends on @langchain/core.
  try {
    const classicAgentsPath = require.resolve('@langchain/classic/agents');
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { createRequire } = require('module') as {
      createRequire: (filename: string) => NodeRequire;
    };
    return createRequire(classicAgentsPath);
  } catch {
    return require;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runtimeRequire = getRuntimeRequire() as (id: string) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
const coreTools = runtimeRequire('@langchain/core/tools') as Record<string, any>;
export const RuntimeDynamicStructuredTool =
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  coreTools['DynamicStructuredTool'] as DynamicStructuredToolCtor;

export const runtimeZod = runtimeRequire('zod') as RuntimeZod;
