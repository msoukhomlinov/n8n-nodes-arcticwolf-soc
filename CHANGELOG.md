# Changelog

All notable changes to this project will be documented in this file.

## [0.3.1] - 2026-04-02

### Changed

- **`ai-tools/runtime.ts`** — `RuntimeDynamicStructuredTool` and `runtimeZod` exports are now wrapped in JavaScript Proxies so that resolution failures are deferred to tool invocation time instead of failing at module load; ensures the node package always registers in n8n even if the langchain runtime anchor is unavailable; the Proxy target for `RuntimeDynamicStructuredTool` uses `function () {}` (not `{}`) to provide `[[Construct]]` per ECMAScript §10.5.13

## [0.2.0] - 2026-03-13

### Changed

- **`ArcticWolfSocAiTools` node** — rewritten to unified single-tool-per-resource architecture; each resource (`ticket`, `ticketComment`, `organization`) is now exposed as a single `DynamicStructuredTool` (e.g. `arcticwolfsoc_ticket`) with a required `operation` enum field instead of one tool per operation; eliminates the toolkit class wrapper
- **`ArcticWolfSocAiTools` node** — dual-path dispatch: `func()` handles MCP Trigger path, `execute()` handles AI Agent path; both funnel into the same executor
- **`ArcticWolfSocAiTools` node** — `execute()` now returns a structured `INVALID_OPERATION` error when the `operation` field is absent or invalid, matching `func()` behaviour (previously silently fell back to `getMany`)
- **AI Tools runtime** — `DynamicStructuredTool` and `runtimeZod` resolved at module load via `createRequire(@langchain/classic/agents)` anchor to fix `instanceof` failures across bundled module copies; Zod schema passed directly to tool (no pre-conversion to JSON Schema)
- **`constants.ts`** — `N8N_METADATA_FIELDS` now includes `'operation'` as defense-in-depth to prevent the unified tool's routing field from leaking into API request bodies
- **`operations.registry.ts`** — `OPERATION_REGISTRY` removed; replaced with `RESOURCE_OPERATIONS` (`{ label, ops }` per resource) and `OP_LABELS`

### Fixed

- **`tool-executor.ts`** — `hasFilters` guard for `ticket.getMany` now correctly excludes `limit` and `offset` (always-present pagination defaults) from the filter check; previously, unfiltered empty results always triggered `NO_RESULTS_FOUND` instead of returning `{ results: [], count: 0 }`
- **`tool-executor.ts`** — `getTicket` now returns `ENTITY_NOT_FOUND` when the API returns `null`, an empty object, or an empty array (HTTP 200 with no body), preventing LLM hallucination
- **`tool-executor.ts`** — `addComment` now returns `MISSING_ENTITY_ID` when `body` is absent or blank instead of silently posting an empty comment to the API
- **`tool-executor.ts`** — all error `nextAction` strings updated to canonical cross-tool reference form (`arcticwolfsoc_<resource> with operation '<op>'`)

### Added

- **`ai-tools/runtime.ts`** — new module; resolves `RuntimeDynamicStructuredTool` and `runtimeZod` from n8n's module tree to fix `instanceof` checks across bundled module copies
- **`error-formatter.ts`** — `formatMissingIdError`, `formatNotFoundError`, `formatNoResultsFound` added; `formatNotFoundError` is now resource-aware with different `nextAction` hints for `ticket` vs `ticketComment`
- **`schema-generator.ts`** — `buildUnifiedSchema()` merges per-op schemas into a flat object with a required `operation` enum and "Used by operations: ..." descriptions on all non-operation fields; `toRuntimeZodSchema()` converter and `getRuntimeSchemaBuilders()` factory added
- **`description-builders.ts`** — `buildUnifiedDescription()` composes a single LLM-facing tool description per resource covering all enabled operations; all descriptions stay under 2000 characters
- **Test suite** (`ai-tools/ai-tools.test.ts`) — 57 tests covering unified schema building, description token budget, all error formatters, and `executeArcticWolfSocTool` including null guard, filtered-empty guard, metadata stripping, unsupported operation/resource handling, and API error propagation

## [0.1.1] - 2026-03-11

### Fixed

- **`ArcticWolfSocAiTools` node** — toolkit base class now probes `n8n-core` for `StructuredToolkit` at runtime (n8n ≥ 2.9) and falls back to `@langchain/classic/agents`'s `Toolkit` on older versions; fixes `"multiple tools with the same name: 'undefined'"` errors when used with AI Agent or MCP Trigger on n8n 2.9+

## [0.1.0] - 2026-03-07

### Added

- **`ArcticWolfSoc` node** — main workflow node supporting three resources:
  - **Ticket** operations: Get Many (with filters, Return All pagination), Get Ticket, Close Ticket
  - **Ticket Comment** operations: Get Many, Get Comment, Add Comment
  - **Organization** operations: Get Many (with optional root UUID filter)
- **`ArcticWolfSocAiTools` node** — AI Agent toolkit exposing all operations as LangChain `DynamicStructuredTool` instances; write operations (Close Ticket, Add Comment) gated behind an `allowWriteOperations` toggle
- **`ArcticWolfApi` credential** (`arcticWolfSocApi`) — Bearer token + region dropdown (US001–CA001); injects `Authorization: Bearer <token>` automatically
- `getOrganizations` dynamic load-options function for populating organization UUID dropdowns from the live API
- Zod schemas, LLM-facing description builders, and structured error formatter for the AI Tools node
