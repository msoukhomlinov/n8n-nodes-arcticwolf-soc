# Changelog

## [0.4.3] - 2026-07-09

### Fixed
- AI Tools nested `zod` dependency install corruption (#3): pinned `zod` to an exact version (dependency hygiene, not a root-cause fix), added a `postinstall` integrity check (`scripts/verify-zod.js`) that fails loudly with a diagnostic when the nested install is missing/truncated, and documented the queue-mode/shared-volume install-race root cause and consumer-side mitigation in the README.

## [0.4.2] - 2026-04-02

### Fixed
- AI Tools `zod`/LangChain resolution on pnpm-isolated n8n hosts (#1): moved `zod` to `dependencies` so schema generation registers under pnpm strict isolation, and reworked `runtime.ts` to resolve `DynamicStructuredTool`/`zod` from n8n's own module tree at execution time via deferred Proxy resolution, preserving `instanceof` identity.

## [0.4.1] - 2026-04-02

### Fixed
- AI Tools `execute()` path: strip `Prompt__*` framework fields injected by n8n Agent Tool Node v3 to prevent INVALID_WRITE_FIELDS errors on write operations.

## [0.4.0] - 2026-04-02

Initial public release with Ticket, Ticket Comment, and Organization resources.
