# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Keeping CLAUDE.md up to date

After completing any task that changes the project's structure, conventions, or workflow, update this file before finishing. Specifically:

- **New node or credential** — update the architecture section if the layout deviates from the existing pattern, and add it to any relevant step-by-step guides.
- **New npm script or change to build pipeline** — update the Commands section.
- **New folder convention or utility pattern** (e.g., a new `utils/` category, a shared helper) — document it in the architecture section.
- **TypeScript config change** — update the TypeScript notes if behaviour changes (e.g., new path aliases, target change).
- **Dependency added that affects how code is written** — note it if future Claude instances need to know about it.

Do not add content that duplicates what can be trivially inferred from reading the files. Only document things that require reading multiple files or that carry non-obvious rules.

## Commands

```bash
npm run build        # clean → tsc (tsconfig.build.json) → gulp (copy SVG icons to dist/)
npm run dev          # tsc watch mode (no icon copy, no clean)
npm run lint         # eslint on .ts files
npm run lint:fix     # eslint with auto-fix
npm run typecheck    # tsc --noEmit (uses tsconfig.json, strict checks, no output)
npm run format       # prettier check
npm run format:fix   # prettier write
npm test             # jest (*.test.ts files)
npm run test:watch   # jest watch mode
```

`prepublishOnly` runs lint + typecheck + build in sequence before `npm publish`.

## Architecture

This is an n8n community node package (v1+ node API). Source lives in `src/`, compiled output goes to `dist/`. The `package.json` `n8n` field registers credentials and node entry points from `dist/`.

### Node structure pattern

Each node lives in `src/nodes/<NodeName>/` with this layout:
- `<NodeName>.node.ts` — implements `INodeType`; contains `description` (metadata + properties) and `execute()`
- `index.ts` — re-exports from `description/index.ts` for clean imports
- `description/index.ts` — assembles the full `INodeProperties[]` array from per-operation files
- `description/<operation>.operation.ts` — exports two things per operation: an `INodePropertyOptions` entry (for the operation selector) and an `INodeProperties[]` array (operation-specific fields with `displayOptions.show.operation`)
- `lib/transport.ts` — generic HTTP helper using `this.helpers.requestWithAuthentication`; wraps failures in `NodeApiError` (no unauthenticated fallback)
- `utils/loadOptions/index.ts` — functions with signature `(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>`, referenced by name in `typeOptions.loadOptionsMethod`

### Adding a new operation

1. Create `src/nodes/<NodeName>/description/<operation>.operation.ts` — export `<operation>OperationOption` and `<operation>OperationFields`
2. Import and add both exports in `description/index.ts`
3. Handle `operation === '<operation>'` in `execute()` in the main node file

### Adding a new node

1. Create `src/nodes/<NewNode>/` following the same layout as `Boilerplate/`
2. Export the class from `src/nodes/index.ts`
3. Register the compiled path in `package.json` under `n8n.nodes`

### Credentials

Credentials live in `src/credentials/<Name>.credentials.ts`, implement `ICredentialType`, and are exported from `src/nodes/index.ts`. Register in `package.json` under `n8n.credentials`.

### SVG icons

Icons must be `.svg` files co-located with the node file. The `gulp build:icons` step (run as part of `npm run build`) copies them from `src/nodes/**/*.svg` to the corresponding `dist/` path. The `dev` watch mode does **not** copy icons — run `build` once first if icons are missing.

### Node description conventions

- Use `NodeConnectionTypes.Main` (imported from `n8n-workflow`) for `inputs`/`outputs` — never the string literal `'main'`.
- Include `subtitle: '={{$parameter["operation"]}}'` so the active operation name is visible on the node card in the canvas.

### execute() patterns

Every node's `execute()` must:
- Wrap each item's processing in `try/catch` and check `this.continueOnFail()` — push `{ json: { error: msg }, pairedItem: { item: itemIndex } }` and `continue` when true, otherwise re-throw.
- Include `pairedItem: { item: itemIndex }` on every `INodeExecutionData` pushed to `returnData`. Without it, n8n data lineage and canvas arrows break.

### AI Tools node pattern

Each service can have a companion `<NodeName>AiTools.node.ts` that exposes operations as LangChain `DynamicStructuredTool` instances for the n8n AI Agent. Layout:

- `<NodeName>AiTools.node.ts` — main node; implements `supplyData()` returning `{ response: toolkit }`, plus an `execute()` stub
- `ai-tools/schema-normalizer.ts` — converts Zod/JSON schema to strict JSON schema with `type:"object"` (required by Anthropic)
- `ai-tools/error-formatter.ts` — maps error messages to `StructuredToolError` objects; tool `func()` always returns JSON strings, never throws
- `ai-tools/schema-generator.ts` — static Zod schemas per operation; every field uses `.describe()` for LLM guidance
- `ai-tools/description-builders.ts` — LLM-facing description strings; use `dateTimeReferenceSnippet()` for time-sensitive ops
- `ai-tools/tool-executor.ts` — strips n8n metadata fields (`sessionId`, `action`, `chatInput`, `tool`, `toolName`, `toolCallId`) from `rawParams` before routing to API

Key rules for AI Tools nodes:
- Use `Toolkit` from `require('@langchain/classic/agents')` — **not** `StructuredToolkit` from `n8n-core` (absent in many n8n versions)
- `inputs: []`, `outputs: [{ type: 'ai_tool' as NodeConnectionType }]`
- Always call `normaliseToolInputSchema(schema)` before passing to `DynamicStructuredTool` — never pass raw Zod
- Write operations guarded by `allowWriteOperations` boolean property (default `false`)
- `@langchain/core` and `zod` go in `devDependencies` only — they are host packages in n8n's runtime `node_modules`
- `NodeConnectionType` is `import type` only; use `'ai_tool' as NodeConnectionType` string literal in outputs

### Dependency conventions

`n8n-workflow` is provided by the n8n runtime. It belongs in both `devDependencies` (for local builds) and `peerDependencies` (to declare the runtime requirement). Do **not** put it in `dependencies`. Never add `n8n-core` as a dependency — community nodes do not import from it.

### Testing

Test files (`*.test.ts`) use Jest + ts-jest. `tsconfig.json` excludes them from production type-checking; `tsconfig.test.json` (extends `tsconfig.json`, removes the test exclusion) covers them for ESLint typed linting. Cast mock contexts to `unknown as IExecuteFunctions` rather than using `any`.

### TypeScript notes

- Source imports use `.js` extensions (e.g., `'./index.js'`) even though files are `.ts` — this is required for CommonJS output compatibility with n8n's loader.
- `tsconfig.json` is for type-checking only (`noEmit: true`); `tsconfig.build.json` extends it with `outDir: dist` and `noEmit: false`; `tsconfig.test.json` extends it and includes `*.test.ts` files for ESLint.
- Strict mode is fully enabled (`strict`, `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noImplicitReturns`).
