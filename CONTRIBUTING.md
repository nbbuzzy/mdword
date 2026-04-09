# Contributing to mdword

## Prerequisites

- Node.js >= 18
- [pandoc](https://pandoc.org/installing.html)
- [@mermaid-js/mermaid-cli](https://github.com/mermaid-js/mermaid-cli) (`npm install -g @mermaid-js/mermaid-cli`)

## Setup

```bash
git clone https://github.com/nbbuzzy/mdword.git
cd mdword
npm install
npm run build
npm link  # optional — makes `mdword` available globally
```

## Development

```bash
npm run dev          # Watch mode (rebuilds on change)
npm run build        # One-time build
npm test             # Run tests
npm run test:watch   # Watch mode for tests
```

## Manual round-trip test

After making changes, verify the full pipeline:

```bash
npm run md2word -- inputs/example-input.md outputs/test.docx
npm run word2md -- outputs/test.docx outputs/test.md
diff inputs/example-input.md outputs/test.md
```

Check that mermaid diagrams are restored and formatting is reasonable.

## Submitting a PR

1. Create a branch from `main`
2. Make your changes
3. Ensure `npm run build` succeeds
4. Run the manual round-trip test above
5. Open a PR against `main`
