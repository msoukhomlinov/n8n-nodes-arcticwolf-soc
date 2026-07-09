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
| ------------ | ------------------------------------------------- |
| Get Many     | Retrieve tickets for an organization with filters |
| Get Ticket   | Retrieve a single ticket by numeric ID            |
| Close Ticket | Close a ticket, optionally adding a comment       |

**Get Many filters:** status (OPEN, NEW, PENDING, HOLD, CLOSED), priority (LOW, NORMAL, HIGH, URGENT), type (QUESTION, INCIDENT, PROBLEM, TASK), assignee email, assignee first/last name, created/updated date ranges. Supports **Return All** (auto-pagination) or a manual **Limit** (1–100).

### Ticket Comment

| Operation   | Description                         |
| ----------- | ----------------------------------- |
| Get Many    | Retrieve all comments on a ticket   |
| Get Comment | Retrieve a single comment by ID     |
| Add Comment | Add a comment to an existing ticket |

### Organization

| Operation | Description                                  |
| --------- | -------------------------------------------- |
| Get Many  | Retrieve all organizations accessible to you |

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

## Troubleshooting

### n8n fails to load the package: `Cannot find module '.../node_modules/zod/index.cjs'`

**Symptom:**

```
Failed to load package "n8n-nodes-arcticwolf-soc" Error: Cannot find module '/home/node/.n8n/nodes/node_modules/n8n-nodes-arcticwolf-soc/node_modules/zod/index.cjs'
```

**Cause:** In shared/queue-mode n8n deployments (multiple workers sharing one `.n8n/nodes` volume), a concurrent or interrupted `npm install` can leave the nested `node_modules/zod` dependency partially extracted or corrupted. n8n does not re-run `npm install` for packages it considers already present, so the broken install persists across restarts. This is an install-race condition on the shared volume, not a version-resolution problem — npm's version selection is not in the failure path.

**What this package does about it:**

- The `zod` dependency is pinned to an exact version. This is dependency hygiene — it removes version drift as a variable — and is **not** a fix for the install-race condition above. The corruption originally occurred while `zod` was already resolving to the same version.
- A `postinstall` integrity check (`scripts/verify-zod.js`) runs after any install that executes npm lifecycle scripts — a manual `npm install`, or a Docker image build. If the nested `zod` is missing or truncated, that install **fails loudly with a clear diagnostic and the exact repair command**, instead of deferring to a cryptic `MODULE_NOT_FOUND` deep in Node's resolver when n8n next starts up. It does not prevent corruption; it makes corruption self-diagnosing — **but only for installs that run scripts**. n8n's built-in community-node installer runs npm with `--ignore-scripts=true`, so this check does **not** run for nodes installed via the n8n GUI. For that path, this section's manual fix and the recurrence guidance below are what actually apply.

**Manual fix:** Repair the nested `zod` install from inside the package directory:

```bash
cd <path-to-.n8n>/nodes/node_modules/n8n-nodes-arcticwolf-soc
rm -rf node_modules/zod
npm install --no-save --legacy-peer-deps zod@3.25.76
```

Then restart n8n (and all workers, if running queue mode).

**Preventing recurrence:** The structural fix is consumer-side and outside this package's control. Do **not** run concurrent or live `npm install` against a shared `.n8n/nodes` volume across multiple queue-mode workers. Instead, either:

- **Serialize the install** — have only the main n8n instance install community nodes, and let workers read the already-populated volume (do not install from every worker at startup); or
- **Bake community nodes into a custom n8n Docker image** with a deterministic, pinned install step at build time, instead of relying on n8n's live community-node installer at runtime.

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
