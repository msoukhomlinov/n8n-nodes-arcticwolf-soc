// nodes/ArcticWolfSoc/ai-tools/runtime.ts
//
// Resolves DynamicStructuredTool and zod from n8n's module tree so that
// instanceof checks pass at runtime. Community nodes bundle their own copies of
// these packages; n8n loads its own copies. JavaScript instanceof fails across
// module copies, so we must use the same instances n8n uses.
import { createRequire } from 'module';
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

const ANCHOR_CANDIDATES = ['@langchain/classic/agents', 'langchain/agents'];

function getRuntimeRequire(): NodeRequire {
  const errors: Array<{ anchor: string; message: string }> = [];

  for (const anchor of ANCHOR_CANDIDATES) {
    try {
      const anchorPath = require.resolve(anchor);
      return createRequire(anchorPath);
    } catch (err) {
      errors.push({
        anchor,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  throw new Error(
    `Failed to resolve n8n runtime require from any anchor candidate.\n` +
      errors.map((e) => `  - ${e.anchor}: ${e.message}`).join('\n'),
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runtimeRequire = getRuntimeRequire() as NodeRequire & ((id: string) => any);

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
const coreTools = runtimeRequire('@langchain/core/tools') as Record<string, any>;
export const RuntimeDynamicStructuredTool =
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  coreTools['DynamicStructuredTool'] as DynamicStructuredToolCtor;

export const runtimeZod = runtimeRequire('zod') as RuntimeZod;
