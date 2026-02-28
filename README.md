# n8n Community Node Boilerplate (v1+)

TypeScript boilerplate for building an n8n community node using the v1+ node standard.

## Requirements
- Node.js >= 20.15
- n8n v1+

## Installation
Install in n8n via the GUI or manually:
```bash
npm install n8n-nodes-example
```

## Usage
This package includes:
- Example credential `ExampleApi`
- Example node `Example`

## Development
```bash
npm install
npm run build
npm run lint
npm run typecheck
```

## Publish
Ensure the package name follows `n8n-nodes-*` (or `@scope/n8n-nodes-*`), then:
```bash
npm publish --access public
```

## License
Apache-2.0 © Max Soukhomlinov


