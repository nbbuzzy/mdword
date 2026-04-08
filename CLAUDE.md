# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mdword is a TypeScript CLI tool for bidirectional markdown ↔ Word (.docx) conversion with special handling for Mermaid diagrams. It wraps `pandoc` for core conversion and `@mermaid-js/mermaid-cli` for diagram rendering.

## Key Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Watch mode with tsx (runs src/cli.ts directly)
npm run build           # Compile TypeScript to dist/
npm start               # Run compiled CLI from dist/cli.js
```

### Testing
```bash
npm test                # Run all tests with vitest
npm run test:watch      # Watch mode for tests
npm run test:coverage   # Generate coverage report
```

### Manual Testing
```bash
npm run md2word -- input.md output.docx          # Test md2word command
npm run word2md -- input.docx output.md          # Test word2md command
```

## Architecture

### Core Conversion Flow

**md2word pipeline:**
```
Input MD → Extract Mermaid → Render PNGs → Pandoc → Output DOCX
           (extractor)        (renderer)    (runner)
```

**word2md pipeline:**
```
Input DOCX → Pandoc → Restore Mermaid → Normalize → Output MD
             (runner)  (restorer)        (normalizer)
```

### Mermaid Sidecar Pattern

Mermaid diagrams are **never** round-tripped through Word. Instead:

1. **Extraction (md2word):** Mermaid fence blocks are extracted to `.mmd` files, rendered to `.png` via `mmdc`, and replaced with image references using an encoded marker in the title attribute (not alt text, to avoid visible metadata in Word):
   ```markdown
   ![](/path/to/diagram-1.png "mdword::example-input::diagram-1.mmd")
   ```

   The encoding format is `mdword::<subdir>::<filename>` where `<subdir>` is the assets subdirectory name (derived from the markdown filename stem). This lets the restorer reconstruct the full path `~/.mdword/assets/<subdir>/<filename>` without needing to know the original input path. The title attribute maps to the docx image description (invisible), so no metadata text appears in the Word document.

2. **Restoration (word2md):** Images with encoded `.mmd` paths (in alt text from round-trip, or in title attribute) are detected, paths are decoded by replacing `::` with `/`, corresponding `.mmd` files are read, and fence blocks are restored:
   ```markdown
   ```mermaid
   graph TD
       A --> B
   ```
   ```

This ensures diagrams remain editable as code across the round-trip.

### Template Resolution Strategy

Templates control Word document styling. Resolution order:
1. Custom path via `--template` flag
2. `.mdword/reference.docx` in project root (walks up directory tree from cwd)
3. Bundled default template at `templates/default-reference.docx`

Implemented in `src/utils/path-resolver.ts` → `resolveTemplate()`.

## Module Organization

### Commands (`src/commands/`)
Entry points for the two main operations. Each orchestrates the full pipeline:
- `md2word.ts` - Markdown to Word conversion
- `word2md.ts` - Word to Markdown conversion

These are thin orchestration layers that call core modules in sequence.

### Core Logic (`src/core/`)
The conversion engines:

- **`mermaid-extractor.ts`** - Regex-based extraction of ` ```mermaid ` blocks; writes `.mmd` files; replaces blocks with image refs using `mdword::<subdir>::<filename>` encoding in the title attribute to keep metadata invisible in Word
- **`mermaid-renderer.ts`** - Spawns `mmdc` CLI to render `.mmd` → `.png`
- **`mermaid-restorer.ts`** - Pattern matches encoded `.mmd` paths in both alt text (from docx round-trip) and title attribute; supports new `mdword::` prefix (resolved against assetsDir) and legacy full-path `::` encoding; reads `.mmd` files; restores fence blocks
- **`pandoc-runner.ts`** - Spawns `pandoc` CLI with proper args for MD↔DOCX conversion
- **`normalizer.ts`** - Post-processes markdown to improve round-trip fidelity (smart quotes → straight quotes, heading styles, emphasis markers, etc.)

### Utilities (`src/utils/`)
- **`errors.ts`** - Custom error hierarchy (`MdWordError`, `PandocError`, `MermaidRenderError`, etc.)
- **`validation.ts`** - Input/output file validation (existence, permissions, extensions)
- **`path-resolver.ts`** - Template and assets directory resolution
- **`file-utils.ts`** - File I/O helpers (temp files, cleanup, path manipulation)

### Entry Points
- **`src/cli.ts`** - Commander-based CLI with two commands (`md2word`, `word2md`)
- **`src/index.ts`** - Public API exports for programmatic usage

## External Dependencies

mdword requires two external CLI tools:

1. **pandoc** - Core MD↔DOCX engine
   - Checked via `pandoc --version`
   - Throws `DependencyError` with install instructions if missing

2. **@mermaid-js/mermaid-cli** (provides `mmdc` command)
   - Checked via `mmdc --version`
   - Throws `DependencyError` if missing

Both are validated at runtime before use.

## TypeScript Configuration

- **Module system:** ESM (`"type": "module"` in package.json)
- **Target:** ES2022
- **Strict mode:** Enabled
- **Output:** `dist/` directory with declaration files
- **Import extensions:** All imports must use `.js` extension (TypeScript ESM requirement)

## Important Patterns

### Error Handling
All errors inherit from `MdWordError`. The CLI's error handler in `src/cli.ts` catches these and formats them with chalk colors. Set `DEBUG=1` env var to see stack traces.

### Temp File Management
Conversion commands use temp files for intermediate steps (e.g., processed markdown before pandoc). Always use try/finally to ensure cleanup via `cleanup()` utility.

### Diagram Numbering
The extractor continues numbering from existing `.mmd` files in the assets directory. If `diagram-1.mmd` through `diagram-3.mmd` exist, the next diagram will be `diagram-4.mmd`. This prevents overwriting diagrams on re-runs.

### Assets Directory Resolution
Default: `~/.mdword/assets/<stem>/` where `<stem>` is the markdown filename without extension (e.g., `notes.md` → `~/.mdword/assets/notes/`). This keeps assets hidden in the user's home directory, isolated per document. Can be overridden with `--assets-dir` flag. The restorer also supports legacy `::` path-encoded references for backwards compatibility.

## Known Round-Trip Limitations

These are documented imperfections users should expect:
- Smart quotes/em-dashes (Word auto-corrects; normalizer reverts to ASCII)
- Emphasis markers may flip between `*` and `_`
- Nested lists (3+ levels) may lose structure
- Inline formatting in table cells sometimes dropped by pandoc
- Table cell spans/merges not supported (GFM pipe tables limitation)

## Testing Strategy

Tests are located in `tests/` directory (structure created but not yet implemented):
- `tests/unit/` - Unit tests for individual modules (extractors, normalizer, etc.)
- `tests/integration/` - End-to-end command tests with real pandoc/mmdc
- `tests/fixtures/round-trip/` - Fixture files for fidelity testing

Integration tests should skip if pandoc/mmdc are not installed.
