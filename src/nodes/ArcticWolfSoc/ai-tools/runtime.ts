// nodes/ArcticWolfSoc/ai-tools/runtime.ts
//
// Resolves DynamicStructuredTool and zod from n8n's module tree so that
// instanceof checks pass at runtime. Community nodes bundle their own copies of
// these packages; n8n loads its own copies. JavaScript instanceof fails across
// module copies, so we must use the same instances n8n uses.
//
// Exports are wrapped in Proxies so that resolution failures are deferred to
// invocation time rather than module load time. This ensures the node package
// always registers in n8n — the error only surfaces when the tool is actually
// used. The Proxy targets must be functions (not plain objects) so that
// [[Construct]] exists on the Proxy per ECMAScript §10.5.13; without it,
// `new RuntimeDynamicStructuredTool(...)` would throw "is not a constructor"
// before the construct trap ever fires.
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

let resolvedCtor: DynamicStructuredToolCtor | undefined;
let resolvedZod: RuntimeZod | undefined;
let resolutionError: Error | undefined;

function resolve(): void {
  if (resolvedCtor) return;
  if (resolutionError) return;

  const errors: Array<{ anchor: string; message: string }> = [];

  for (const anchor of ANCHOR_CANDIDATES) {
    try {
      const anchorPath = require.resolve(anchor);
      const runtimeRequire = createRequire(anchorPath);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      const coreTools = runtimeRequire('@langchain/core/tools') as Record<string, any>;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      resolvedCtor = coreTools['DynamicStructuredTool'] as DynamicStructuredToolCtor;
      resolvedZod = runtimeRequire('zod') as RuntimeZod;
      return;
    } catch (err) {
      errors.push({
        anchor,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  resolutionError = new Error(
    `Failed to resolve n8n runtime require from any anchor candidate.\n` +
      errors.map((e) => `  - ${e.anchor}: ${e.message}`).join('\n'),
  );
}

// Attempt resolution eagerly — if it fails, the error is captured and deferred.
try {
  resolve();
} catch {
  // Swallowed; resolutionError is already set inside resolve().
}

function getResolvedCtor(): DynamicStructuredToolCtor {
  resolve();
  if (!resolvedCtor) {
    throw resolutionError ?? new Error('RuntimeDynamicStructuredTool could not be resolved');
  }
  return resolvedCtor;
}

function getResolvedZod(): RuntimeZod {
  resolve();
  if (!resolvedZod) {
    throw resolutionError ?? new Error('runtimeZod could not be resolved');
  }
  return resolvedZod;
}

// Proxy target must be a function so the Proxy has [[Construct]].
// The function itself is never called — the construct/apply/get traps delegate
// to the resolved class.
// eslint-disable-next-line @typescript-eslint/no-empty-function
const proxyTarget = function () {} as unknown as DynamicStructuredToolCtor;

export const RuntimeDynamicStructuredTool = new Proxy(proxyTarget, {
  construct(_target, args) {
    const Ctor = getResolvedCtor();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    return new Ctor(...(args as [any]));
  },
  get(_target, prop, receiver) {
    const Ctor = getResolvedCtor();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return Reflect.get(Ctor, prop, receiver);
  },
  getPrototypeOf() {
    const Ctor = getResolvedCtor();
    return Ctor.prototype as object;
  },
}) as unknown as DynamicStructuredToolCtor;

export const runtimeZod = new Proxy({} as RuntimeZod, {
  get(_target, prop, receiver) {
    const z = getResolvedZod();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return Reflect.get(z, prop, receiver);
  },
});
