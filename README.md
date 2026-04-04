# mdword

Bidirectional markdown ↔ Word conversion with mermaid diagram support.

A two-command CLI tool that converts Markdown to `.docx` for collaborator editing, then converts the edited `.docx` back to Markdown with fidelity across tables, prose, code blocks, and Mermaid diagrams.

## Features

- **Two discrete commands**: `md2word` and `word2md` for inspectable, debuggable conversions
- **Mermaid diagram support**: Automatically extracts, renders, and restores Mermaid diagrams
- **Template-based styling**: Use custom Word templates to control document appearance
- **Round-trip fidelity**: Designed to minimize data loss during markdown → docx → markdown conversion
- **Smart normalization**: Cleans up smart quotes, line endings, and formatting inconsistencies

## Installation

### Prerequisites

This tool requires two external dependencies:

1. **pandoc** - Core conversion engine
   ```bash
   # macOS
   brew install pandoc

   # Ubuntu/Debian
   sudo apt install pandoc

   # Windows
   # Download from https://pandoc.org/installing.html
   ```

2. **@mermaid-js/mermaid-cli** - Diagram rendering
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   ```

### Install mdword

```bash
npm install -g mdword
```

Or use locally in your project:

```bash
npm install mdword
```

## Usage

### Convert Markdown to Word

```bash
mdword md2word input.md output.docx
```

Options:
- `-t, --template <path>` - Use custom reference.docx template
- `-a, --assets-dir <path>` - Custom assets directory for diagrams (default: `assets/diagrams` relative to input file)
- `-v, --verbose` - Enable verbose output

Example:
```bash
mdword md2word inputs/README.md outputs/README.docx --verbose
```

### Convert Word to Markdown

```bash
mdword word2md input.docx output.md
```

Options:
- `-a, --assets-dir <path>` - Custom assets directory for diagrams
- `-v, --verbose` - Enable verbose output
- `--no-normalize` - Disable markdown normalization

Example:
```bash
mdword word2md outputs/edited.docx inputs/updated.md --verbose
```

## Project Structure

When working with mdword, use this recommended folder structure:

```
your-project/
├── inputs/          # Source markdown files (gitignored)
│   └── document.md
├── outputs/         # Generated Word documents (gitignored)
│   └── document.docx
├── assets/          # Auto-generated diagram files (gitignored)
│   └── diagrams/
│       ├── diagram-1.mmd  # Mermaid source
│       └── diagram-1.png  # Rendered image
└── .mdword/         # Optional: custom template
    └── reference.docx
```

**Key points:**
- `inputs/` - Put your source markdown files here
- `outputs/` - Generated .docx files go here
- `assets/diagrams/` - Automatically created by mdword for mermaid diagrams
- `.mdword/reference.docx` - Optional custom Word template (walked up from cwd)

All three directories (`inputs/`, `outputs/`, `assets/`) should be gitignored since they contain generated or user-specific content.

## How It Works

### md2word Workflow

1. **Extract Mermaid**: Parses markdown for ` ```mermaid ` blocks
2. **Write Sidecars**: Saves each diagram to `assets/diagrams/diagram-N.mmd`
3. **Render PNGs**: Executes `mmdc` to generate PNG images
4. **Replace Blocks**: Inserts image with .mmd path in alt text (survives Word round-trip)
5. **Run Pandoc**: Converts processed markdown to .docx with template styles

### word2md Workflow

1. **Run Pandoc**: Converts .docx to markdown (with GFM output for clean tables)
2. **Normalize HTML**: Converts `<figure>` blocks to markdown image syntax
3. **Detect Markers**: Finds images with `.mmd` paths in alt text
4. **Restore Source**: Reads .mmd files and replaces with fence blocks
4. **Normalize**: Cleans up formatting (smart quotes, whitespace, headers)

### Mermaid Diagram Handling

Mermaid diagrams are stored as **sidecar files**:

- `.mmd` files contain the source code
- `.png` files contain the rendered images
- HTML comments preserve the reference during round-trip

Example:

Input markdown:
````markdown
```mermaid
graph TD
    A --> B
```
````

After md2word processing:
```markdown
<!-- mermaid:assets/diagrams/diagram-1.mmd -->
![diagram-1](assets/diagrams/diagram-1.png)
```

After word2md restoration:
````markdown
```mermaid
graph TD
    A --> B
```
````

## Templates

mdword uses Word templates to control document styling. Template lookup order:

1. Custom path via `--template` flag
2. `.mdword/reference.docx` in project directory (walks up directory tree)
3. Pandoc's default styles (if no template is found)

**Templates are optional.** If no template is found, pandoc will use its built-in default styles, which are adequate for most use cases.

### Creating a Custom Template

To customize the appearance of generated Word documents:

1. Create a Word document with your desired styles (Heading 1-3, Normal, Code, Table Grid)
2. Save as `.mdword/reference.docx` in your project root
3. mdword will automatically find and use it

See `templates/README.md` for detailed instructions.

## Directory Structure

Recommended project layout:

```
my-project/
├── docs/
│   ├── my-doc.md               # Source of truth
│   └── assets/
│       └── diagrams/
│           ├── diagram-1.mmd   # Mermaid source (commit to git)
│           └── diagram-1.png   # Rendered PNG (commit or gitignore)
└── .mdword/
    └── reference.docx          # Word style template (commit to git)
```

## Known Limitations

These are expected round-trip imperfections:

- **Smart quotes/em-dashes**: Word auto-corrects; normalizer converts back to ASCII
- **Emphasis markers**: May flip between `*` and `_` (both valid markdown)
- **Nested lists (3+ levels)**: Word's list model differs from markdown
- **Inline formatting in tables**: Bold/italic sometimes dropped by pandoc
- **Heading hierarchy changes**: If collaborators restructure headings, conversion breaks
- **Table spans/merged cells**: GFM pipe tables don't support cell spans
- **Mermaid diagrams**: PNGs not editable (by design); source always from .mmd files

## Development

### Build

```bash
npm install
npm run build
```

### Test

```bash
npm test
npm run test:coverage
```

### Development Mode

```bash
npm run dev
```

## API Usage

mdword can also be used programmatically:

```typescript
import { md2word, word2md } from 'mdword';

// Convert markdown to Word
await md2word('input.md', 'output.docx', {
  template: '.mdword/reference.docx',
  verbose: true,
});

// Convert Word to markdown
await word2md('input.docx', 'output.md', {
  verbose: true,
  noNormalize: false,
});
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or pull request.
