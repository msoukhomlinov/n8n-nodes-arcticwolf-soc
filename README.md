# n8n-nodes-arcticwolf-soc

An n8n community node package for the **Arctic Wolf SOC** platform, providing access to the Ticket API and Organizations API.

## Requirements

- Node.js >= 20.15
- n8n v1+

## Installation

Install in n8n via the Community Nodes GUI, or manually:

```bash
npm install n8n-nodes-arcticwolf-soc
```

## Supported Resources & Operations

### Ticket

| Operation    | Description                                       |
|--------------|---------------------------------------------------|
| Get Many     | Retrieve tickets for an organization with filters |
| Get Ticket   | Retrieve a single ticket by numeric ID            |
| Close Ticket | Close a ticket, optionally adding a comment       |

**Get Many filters:** status (OPEN, NEW, PENDING, HOLD, CLOSED), priority (LOW, NORMAL, HIGH, URGENT), type (QUESTION, INCIDENT, PROBLEM, TASK), assignee email, assignee first/last name, created/updated date ranges. Supports **Return All** (auto-pagination) or a manual **Limit** (1–100).

### Ticket Comment

| Operation   | Description                                                |
|-------------|------------------------------------------------------------|
| Get Many    | Retrieve all comments on a ticket                         |
| Get Comment | Retrieve a single comment by ID                           |
| Add Comment | Add a comment to an existing ticket                       |

### Organization

| Operation | Description                                           |
|-----------|-------------------------------------------------------|
| Get Many  | Retrieve all organizations accessible to you          |

**Get Many filters:** optionally scope results to child organizations of a given root organization UUID.

## Credential Setup

Create a credential of type **Arctic Wolf SOC API** with:

- **Bearer Token** — the JWT token obtained from the Arctic Wolf portal or via the quick-start guide
- **Region** — the Arctic Wolf region your account is hosted in (US001, US002, US003, EU001, AU001, CA001)

The credential automatically injects `Authorization: Bearer <token>` on every request.

> **API Documentation:** [to be made public soon]

## AI Tools Node

This package also includes an **Arctic Wolf SOC AI Tools** node that exposes all operations as LangChain `DynamicStructuredTool` instances for use with the n8n AI Agent. Connect it to an AI Agent node to allow the agent to query and manage Arctic Wolf tickets autonomously.

Write operations (Close Ticket, Add Comment) are disabled by default and must be explicitly enabled with the **Allow Write Operations** toggle.

## Development

```bash
npm install
npm run build       # compile + copy SVG icons
npm run typecheck   # strict TypeScript check
npm run lint        # ESLint
npm test            # Jest test suite
```

## License

MIT © Max Soukhomlinov
