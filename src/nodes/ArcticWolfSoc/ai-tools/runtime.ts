// nodes/ArcticWolfSoc/ai-tools/runtime.ts
//
// Resolves DynamicStructuredTool and zod from n8n's module tree so that
// instanceof checks pass at runtime. Community nodes bundle their own copies of
// these packages; n8n loads its own copies. JavaScript instanceof fails across
// module copies, so we must use the same instances n8n uses.
//
// CRITICAL: none of this resolution runs at module-import time. n8n imports
// every node file at registration time; a throw here fails the WHOLE package.
// Under pnpm-strict-isolated installs (n8n >=2.29.x) this package sits outside
// n8n's node_modules, so NO filesystem resolution reaches the host copies at
// load. All resolution is deferred into the Proxy traps below (fire at execution
// time) and falls back to a require.cache scan anchored on n8n-owned packages.
//
// Proxy target for RuntimeDynamicStructuredTool MUST be a function (not {}).
// Per ECMAScript §10.5.13 a Proxy only has [[Construct]] if its target does.
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

const ANCHOR_CANDIDATES = ['@langchain/classic/agents', 'langchain/agents'] as const;

const OWN_PACKAGE_NAME = 'n8n-nodes-arcticwolf-soc';

const LANGCHAIN_TREE_PATTERNS = [
  /[\\/]@n8n[\\/]n8n-nodes-langchain[\\/]/,
  /[\\/]@langchain[\\/]classic[\\/]/,
] as const;

const ZOD_TREE_PATTERNS = [
  /[\\/]@n8n[\\/]n8n-nodes-langchain[\\/]/,
  /[\\/]n8n-workflow[\\/]/,
  /[\\/]n8n-core[\\/]/,
] as const;

let _runtimeReq: NodeRequire | undefined;
let _anchorDiagnostic: string | null = null;

function getRuntimeRequire(): NodeRequire | undefined {
  if (_runtimeReq) return _runtimeReq;

  const tried: string[] = [];

  const mainFile = require.main?.filename;
  if (mainFile) {
    try {
      const req = createRequire(mainFile);
      req.resolve('@langchain/core/tools');
      _runtimeReq = req;
      _anchorDiagnostic = 'resolved via require.main';
      return _runtimeReq;
    } catch (e) {
      tried.push(`require.main (${mainFile}): ${(e as Error).message}`);
    }
  }

  for (const anchor of ANCHOR_CANDIDATES) {
    try {
      const resolved = require.resolve(anchor);
      _runtimeReq = createRequire(resolved);
      _anchorDiagnostic = `resolved via anchor: ${anchor}`;
      return _runtimeReq;
    } catch (e) {
      tried.push(`${anchor}: ${(e as Error).message}`);
    }
  }

  _anchorDiagnostic = `Could not resolve LangChain anchor. Tried:\n${tried.join('\n')}`;
  return undefined;
}

function requireFromCachedTree(patterns: readonly RegExp[], id: string): unknown {
  try {
    const cache = require.cache;
    if (!cache) return undefined;
    const keys = Object.keys(cache);
    for (const pattern of patterns) {
      for (const key of keys) {
        if (!pattern.test(key)) continue;
        if (key.includes(OWN_PACKAGE_NAME)) continue;
        const entry = cache[key];
        if (!entry?.filename) continue;
        try {
          return createRequire(entry.filename)(id);
        } catch {
          // try next candidate
        }
      }
    }
  } catch {
    // best-effort
  }
  return undefined;
}

let _RuntimeDynamicStructuredTool: DynamicStructuredToolCtor | undefined;
let _runtimeZod: RuntimeZod | undefined;
let _langchainLoadError: string | null = null;
let _zodLoadError: string | null = null;
let _zodDiagnostic: string | null = null;

function resolveDynamicStructuredTool(): DynamicStructuredToolCtor | undefined {
  if (_RuntimeDynamicStructuredTool) return _RuntimeDynamicStructuredTool;

  const runtimeReq = getRuntimeRequire();
  if (runtimeReq) {
    try {
      const coreTools = runtimeReq('@langchain/core/tools') as Record<string, unknown>;
      if (typeof coreTools?.['DynamicStructuredTool'] === 'function') {
        _RuntimeDynamicStructuredTool = coreTools['DynamicStructuredTool'] as DynamicStructuredToolCtor;
        return _RuntimeDynamicStructuredTool;
      }
    } catch (e) {
      _langchainLoadError = (e as Error).message;
    }
  }

  const viaTree = requireFromCachedTree(LANGCHAIN_TREE_PATTERNS, '@langchain/core/tools') as
    | Record<string, unknown>
    | undefined;
  if (viaTree && typeof viaTree['DynamicStructuredTool'] === 'function') {
    _RuntimeDynamicStructuredTool = viaTree['DynamicStructuredTool'] as DynamicStructuredToolCtor;
    _langchainLoadError = null;
  }
  return _RuntimeDynamicStructuredTool;
}

function resolveZod(): RuntimeZod | undefined {
  if (_runtimeZod) return _runtimeZod;

  const mainFile = require.main?.filename;
  if (mainFile) {
    try {
      const mainReq = createRequire(mainFile);
      const resolvedPath = mainReq.resolve('zod');
      if (!resolvedPath.includes(OWN_PACKAGE_NAME)) {
        _runtimeZod = mainReq('zod') as RuntimeZod;
        if (_runtimeZod) {
          _zodDiagnostic = 'resolved zod via require.main';
          _zodLoadError = null;
          return _runtimeZod;
        }
      }
    } catch (e) {
      _zodLoadError = (e as Error).message;
    }
  }

  const viaTree = requireFromCachedTree(ZOD_TREE_PATTERNS, 'zod') as RuntimeZod | undefined;
  if (
    viaTree &&
    typeof (viaTree as unknown as Record<string, unknown>)['ZodType'] === 'function' &&
    typeof (viaTree as unknown as Record<string, unknown>)['object'] === 'function'
  ) {
    _runtimeZod = viaTree;
    _zodLoadError = null;
    _zodDiagnostic = 'resolved zod via cached n8n-tree module anchor';
    return _runtimeZod;
  }

  return _runtimeZod;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const proxyTarget = function () {} as unknown as DynamicStructuredToolCtor;

export const RuntimeDynamicStructuredTool = new Proxy(proxyTarget, {
  construct(_target, args) {
    const ctor = resolveDynamicStructuredTool();
    if (!ctor) {
      throw new Error(
        `[ArcticWolfSocAiTools] Could not resolve LangChain's DynamicStructuredTool. ` +
          `Ensure @n8n/nodes-langchain is installed in n8n's node_modules.` +
          (_anchorDiagnostic ? ` Diagnostic: ${_anchorDiagnostic}` : '') +
          (_langchainLoadError ? ` Load error: ${_langchainLoadError}` : ''),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
    return new (ctor as any)(...args) as object;
  },
  get(_target, prop) {
    const ctor = resolveDynamicStructuredTool();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    return ctor ? (ctor as any)[prop] : undefined;
  },
  getPrototypeOf() {
    const ctor = resolveDynamicStructuredTool();
    return ctor ? (ctor.prototype as object) : null;
  },
}) as unknown as DynamicStructuredToolCtor;

export const runtimeZod = new Proxy({} as RuntimeZod, {
  get(_target, prop) {
    if (typeof prop === 'symbol' || prop === 'then' || prop === 'constructor') return undefined;
    const z = resolveZod();
    if (!z) {
      throw new Error(
        `[ArcticWolfSocAiTools] Could not resolve zod (accessing .${String(prop)}) ` +
          `via require.main or n8n-owned-tree cache anchor. ` +
          `Ensure @n8n/nodes-langchain is installed in n8n's node_modules.` +
          (_zodDiagnostic
            ? ` Diagnostic: ${_zodDiagnostic}`
            : _anchorDiagnostic
              ? ` Diagnostic: ${_anchorDiagnostic}`
              : '') +
          (_zodLoadError ? ` Load error: ${_zodLoadError}` : ''),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    return (z as any)[prop];
  },
});
