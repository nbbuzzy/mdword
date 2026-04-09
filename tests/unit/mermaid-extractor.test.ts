import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { randomBytes } from 'crypto';
import { extractMermaidDiagrams } from '../../src/core/mermaid-extractor.js';

describe('extractMermaidDiagrams', () => {
  let tempDir: string;
  let assetsDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `mdword-test-extract-${randomBytes(6).toString('hex')}`);
    assetsDir = path.join(tempDir, 'assets');
    await fs.ensureDir(assetsDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeInput(content: string): Promise<string> {
    const inputPath = path.join(tempDir, 'input.md');
    await fs.writeFile(inputPath, content, 'utf-8');
    return inputPath;
  }

  it('extracts a single mermaid diagram', async () => {
    const inputPath = await writeInput(
      'Hello\n\n```mermaid\ngraph TD\n    A --> B\n```\n\nWorld',
    );

    const result = await extractMermaidDiagrams(inputPath, assetsDir);

    expect(result.diagrams).toHaveLength(1);
    expect(result.diagrams[0].id).toBe('diagram-1');
    expect(result.diagrams[0].content).toBe('graph TD\n    A --> B');
    expect(result.processedMarkdown).not.toContain('```mermaid');
    expect(result.processedMarkdown).toContain('diagram-1.png');
  });

  it('extracts multiple mermaid diagrams', async () => {
    const inputPath = await writeInput(
      '```mermaid\ngraph TD\n    A --> B\n```\n\ntext\n\n```mermaid\nsequenceDiagram\n    A->>B: Hello\n```',
    );

    const result = await extractMermaidDiagrams(inputPath, assetsDir);

    expect(result.diagrams).toHaveLength(2);
    expect(result.diagrams[0].id).toBe('diagram-1');
    expect(result.diagrams[1].id).toBe('diagram-2');
    expect(result.diagrams[0].content).toBe('graph TD\n    A --> B');
    expect(result.diagrams[1].content).toBe('sequenceDiagram\n    A->>B: Hello');
  });

  it('writes .mmd files to assets directory', async () => {
    const inputPath = await writeInput('```mermaid\ngraph TD\n    A --> B\n```');

    await extractMermaidDiagrams(inputPath, assetsDir);

    const mmdContent = await fs.readFile(path.join(assetsDir, 'diagram-1.mmd'), 'utf-8');
    expect(mmdContent).toBe('graph TD\n    A --> B');
  });

  it('continues numbering from existing .mmd files', async () => {
    // Write existing diagram files before extraction
    await fs.writeFile(path.join(assetsDir, 'diagram-1.mmd'), 'existing1', 'utf-8');
    await fs.writeFile(path.join(assetsDir, 'diagram-3.mmd'), 'existing3', 'utf-8');

    // Verify they exist
    const files = await fs.readdir(assetsDir);
    expect(files).toContain('diagram-1.mmd');
    expect(files).toContain('diagram-3.mmd');

    const inputPath = await writeInput('```mermaid\ngraph TD\n    A --> B\n```');

    const result = await extractMermaidDiagrams(inputPath, assetsDir);

    expect(result.diagrams[0].id).toBe('diagram-4');
  });

  it('encodes path with mdword:: prefix in title attribute', async () => {
    const inputPath = await writeInput('```mermaid\ngraph TD\n    A --> B\n```');

    const result = await extractMermaidDiagrams(inputPath, assetsDir);

    // Should have mdword::<subdir>::<filename> in title
    const assetsSubdir = path.basename(assetsDir);
    expect(result.processedMarkdown).toContain(`"mdword::${assetsSubdir}::diagram-1.mmd"`);
  });

  it('uses image syntax with empty alt text', async () => {
    const inputPath = await writeInput('```mermaid\ngraph TD\n    A --> B\n```');

    const result = await extractMermaidDiagrams(inputPath, assetsDir);

    // Should be ![](path "encoded") — empty alt text
    expect(result.processedMarkdown).toMatch(/^!\[\]\(/m);
  });

  it('returns markdown unchanged when no mermaid blocks exist', async () => {
    const content = '# Hello\n\nSome text\n\n```javascript\nconst x = 1;\n```';
    const inputPath = await writeInput(content);

    const result = await extractMermaidDiagrams(inputPath, assetsDir);

    expect(result.diagrams).toHaveLength(0);
    expect(result.processedMarkdown).toBe(content);
  });

  it('records approximate source location', async () => {
    const inputPath = await writeInput(
      'line 1\nline 2\n\n```mermaid\ngraph TD\n    A --> B\n```',
    );

    const result = await extractMermaidDiagrams(inputPath, assetsDir);

    // The mermaid block starts at line 4
    expect(result.diagrams[0].sourceLocation).toBe(4);
  });

  it('normalizes CRLF line endings in input', async () => {
    const inputPath = await writeInput('```mermaid\r\ngraph TD\r\n    A --> B\r\n```');

    const result = await extractMermaidDiagrams(inputPath, assetsDir);

    expect(result.diagrams).toHaveLength(1);
    expect(result.diagrams[0].content).toBe('graph TD\n    A --> B');
  });
});
