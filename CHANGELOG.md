# Changelog

All notable changes to this project will be documented in this file.

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
