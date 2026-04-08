# mdword

Bidirectional markdown ↔ Word conversion with mermaid diagram support.

A two-command CLI tool that converts Markdown to `.docx` for collaborator editing, then converts the edited `.docx` back to Markdown with fidelity across tables, prose, code blocks, and Mermaid diagrams.

## Features

- **Two discrete commands**: `md2word` and `word2md` for inspectable, debuggable conversions
- **Mermaid diagram support**: Automatically extracts, renders, and restores Mermaid diagrams
- **Template-based styling**: Use custom Word templates to control document appearance
- **Round-trip fidelity**: Designed to minimize data loss during markdown → docx → markdown conversion
- **Smart normalization**: Cleans up smart quotes, line endings, and formatting inconsistencies

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Link CLI globally
npm link

# Test it works
mdword --version

# Convert markdown to Word
mdword md2word inputs/example-input.md outputs/output.docx

# Convert Word back to markdown
mdword word2md outputs/output.docx outputs/result.md
```

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

**For end users** (when published to npm):
```bash
npm install -g mdword
```

**For local development** (this repository):
```bash
# 1. Install dependencies
npm install

# 2. Build the TypeScript code
npm run build

# 3. Link the CLI globally for testing
npm link

# Now 'mdword' command is available globally
mdword --version
```

## Usage

### Convert Markdown to Word

```bash
mdword md2word input.md output.docx
```

Options:
- `-t, --template <path>` - Use custom reference.docx template
- `-a, --assets-dir <path>` - Custom assets directory for diagrams (default: `~/.mdword/assets/<name>/`)
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
└── .mdword/         # Optional: custom template
    └── reference.docx

~/.mdword/               # Hidden in home directory
└── assets/
    └── document-a1b2c3d4/   # Per-file, collision-safe
        ├── diagram-1.mmd    # Mermaid source
        └── diagram-1.png    # Rendered image
```

**Key points:**
- `inputs/` - Put your source markdown files here
- `outputs/` - Generated .docx files go here
- `~/.mdword/assets/` - Diagram files are stored in your home directory, isolated per input file
- `.mdword/reference.docx` - Optional custom Word template (walked up from cwd)

The `inputs/` and `outputs/` directories should be gitignored since they contain generated or user-specific content.

## How It Works

### md2word Workflow

1. **Extract Mermaid**: Parses markdown for ` ```mermaid ` blocks
2. **Write Sidecars**: Saves each diagram to `~/.mdword/assets/<name>/diagram-N.mmd`
3. **Render PNGs**: Executes `mmdc` to generate PNG images
4. **Replace Blocks**: Inserts image with .mmd path in title attribute (invisible in Word, survives round-trip)
5. **Run Pandoc**: Converts processed markdown to .docx with template styles

### word2md Workflow

1. **Run Pandoc**: Converts .docx to markdown (with GFM output for clean tables)
2. **Normalize HTML**: Converts `<figure>` blocks to markdown image syntax
3. **Detect Markers**: Finds images with `.mmd` paths in title/alt text
4. **Restore Source**: Reads .mmd files and replaces with fence blocks
4. **Normalize**: Cleans up formatting (smart quotes, whitespace, headers)

### Mermaid Diagram Handling

Mermaid diagrams are stored as sidecar files in `~/.mdword/assets/<name>/`:

- `.mmd` files contain the source code (e.g., `diagram-1.mmd`)
- `.png` files contain the rendered images (e.g., `diagram-1.png`)
- Image title attribute stores an encoded marker (invisible in Word, survives round-trip)

**How it works:**

1. **md2word**: Extracts mermaid blocks → saves to `.mmd` → renders to `.png` → embeds image with `.mmd` path in title attribute (not visible in Word)
2. **Word preserves** the title in the image metadata (invisible to the reader)
3. **word2md**: Reads title/alt text → finds corresponding `.mmd` file → restores mermaid fence block

Example:

Input markdown:
````markdown
```mermaid
graph TD
    A --> B
```
````

After md2word (internal - stored in Word document image title, invisible):
```markdown
![](diagram-1.png "mdword::document-a1b2c3d4::diagram-1.mmd")
```

After word2md restoration:
````markdown
```mermaid
graph TD
    A --> B
```
````

The encoded marker in the image title is what enables round-trip fidelity. Never delete `~/.mdword/assets/` if you want to convert documents back to markdown.

## Templates

mdword uses Word templates to control document styling. Template lookup order:

1. Custom path via `--template` flag
2. `.mdword/reference.docx` in project directory (walks up directory tree)
3. Bundled default template at `templates/default-reference.docx` (with styled tables)
4. Pandoc's default styles (fallback)

The bundled default template includes:
- Styled tables with borders and gray header rows
- Proper heading styles (H1, H2, H3)
- Code block formatting
- Standard paragraph styles

### Creating a Custom Template

To customize the appearance of generated Word documents:

1. Create a Word document with your desired styles (Heading 1-3, Normal, Code, Table Grid)
2. Save as `.mdword/reference.docx` in your project root
3. mdword will automatically find and use it

See `templates/README.md` for detailed instructions.

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

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Link CLI globally for testing
npm link
```

### Testing the CLI

**Option 1: Use npm scripts (during development)**
```bash
npm run md2word -- inputs/example-input.md outputs/output.docx
npm run word2md -- outputs/output.docx outputs/result.md
```

**Option 2: Use the linked global command**
```bash
mdword md2word inputs/example-input.md outputs/output.docx
mdword word2md outputs/output.docx outputs/result.md
```

### Running Tests

```bash
npm test
npm run test:coverage
npm run test:watch
```

### Development Mode

Watch for changes and rebuild automatically:
```bash
npm run dev
```

### Unlink (when done)

```bash
npm unlink -g mdword
```

## Publishing to npm

When ready to publish:

```bash
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Build
npm run build

# 3. Publish
npm publish
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or pull request.
