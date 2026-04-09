import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { restoreMermaidDiagrams } from '../../src/core/mermaid-restorer.js';

describe('restoreMermaidDiagrams', () => {
  let tempDir: string;
  let assetsDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `mdword-test-${Date.now()}`);
    assetsDir = path.join(tempDir, 'assets', 'my-doc');
    await fs.ensureDir(assetsDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('title attribute pattern', () => {
    it('restores diagram from mdword:: encoded title', async () => {
      const mmdPath = path.join(assetsDir, 'diagram-1.mmd');
      await fs.writeFile(mmdPath, 'graph TD\n    A --> B', 'utf-8');

      // Simulate the path the restorer will resolve: ~/.mdword/assets/my-doc/diagram-1.mmd
      // We need to mock the home dir or use the actual encoding
      const homeMdwordAssets = path.join(os.homedir(), '.mdword', 'assets', 'my-doc');
      await fs.ensureDir(homeMdwordAssets);
      await fs.writeFile(
        path.join(homeMdwordAssets, 'diagram-1.mmd'),
        'graph TD\n    A --> B',
        'utf-8',
      );

      const markdown = '![](image.png "mdword::my-doc::diagram-1.mmd")';
      const result = await restoreMermaidDiagrams(markdown, tempDir, assetsDir);

      expect(result).toBe('```mermaid\ngraph TD\n    A --> B\n```');

      // Cleanup home dir test files
      await fs.remove(path.join(os.homedir(), '.mdword', 'assets', 'my-doc'));
    });
  });

  describe('alt text pattern', () => {
    it('restores diagram from :: encoded alt text', async () => {
      const homeMdwordAssets = path.join(os.homedir(), '.mdword', 'assets', 'my-doc');
      await fs.ensureDir(homeMdwordAssets);
      await fs.writeFile(
        path.join(homeMdwordAssets, 'diagram-1.mmd'),
        'sequenceDiagram\n    A->>B: Hello',
        'utf-8',
      );

      const markdown = '![mdword::my-doc::diagram-1.mmd](image.png)';
      const result = await restoreMermaidDiagrams(markdown, tempDir, assetsDir);

      expect(result).toBe('```mermaid\nsequenceDiagram\n    A->>B: Hello\n```');

      await fs.remove(path.join(os.homedir(), '.mdword', 'assets', 'my-doc'));
    });
  });

  describe('HTML img tag pattern', () => {
    it('restores diagram from img tag with title attribute', async () => {
      const homeMdwordAssets = path.join(os.homedir(), '.mdword', 'assets', 'my-doc');
      await fs.ensureDir(homeMdwordAssets);
      await fs.writeFile(
        path.join(homeMdwordAssets, 'diagram-1.mmd'),
        'graph LR\n    X --> Y',
        'utf-8',
      );

      const markdown =
        '<img src="image.png" title="mdword::my-doc::diagram-1.mmd" alt="" />';
      const result = await restoreMermaidDiagrams(markdown, tempDir, assetsDir);

      expect(result).toBe('```mermaid\ngraph LR\n    X --> Y\n```');

      await fs.remove(path.join(os.homedir(), '.mdword', 'assets', 'my-doc'));
    });
  });

  describe('missing .mmd files', () => {
    it('leaves image in place when .mmd file is missing', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const markdown = '![](image.png "mdword::nonexistent::diagram-1.mmd")';
      const result = await restoreMermaidDiagrams(markdown, tempDir, assetsDir);

      expect(result).toBe(markdown);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('multiple diagrams', () => {
    it('restores multiple diagrams in one document', async () => {
      const homeMdwordAssets = path.join(os.homedir(), '.mdword', 'assets', 'my-doc');
      await fs.ensureDir(homeMdwordAssets);
      await fs.writeFile(
        path.join(homeMdwordAssets, 'diagram-1.mmd'),
        'graph TD\n    A --> B',
        'utf-8',
      );
      await fs.writeFile(
        path.join(homeMdwordAssets, 'diagram-2.mmd'),
        'graph LR\n    X --> Y',
        'utf-8',
      );

      const markdown = [
        'Text before',
        '![](img1.png "mdword::my-doc::diagram-1.mmd")',
        'Text between',
        '![](img2.png "mdword::my-doc::diagram-2.mmd")',
        'Text after',
      ].join('\n');

      const result = await restoreMermaidDiagrams(markdown, tempDir, assetsDir);

      expect(result).toContain('```mermaid\ngraph TD\n    A --> B\n```');
      expect(result).toContain('```mermaid\ngraph LR\n    X --> Y\n```');
      expect(result).toContain('Text before');
      expect(result).toContain('Text between');
      expect(result).toContain('Text after');

      await fs.remove(path.join(os.homedir(), '.mdword', 'assets', 'my-doc'));
    });
  });

  describe('no diagrams', () => {
    it('returns markdown unchanged when no encoded paths exist', async () => {
      const markdown = '# Hello\n\n![](regular-image.png)\n\nSome text';
      const result = await restoreMermaidDiagrams(markdown, tempDir, assetsDir);

      expect(result).toBe(markdown);
    });
  });

  describe('CRLF handling', () => {
    it('normalizes CRLF in .mmd file content', async () => {
      const homeMdwordAssets = path.join(os.homedir(), '.mdword', 'assets', 'my-doc');
      await fs.ensureDir(homeMdwordAssets);
      await fs.writeFile(
        path.join(homeMdwordAssets, 'diagram-1.mmd'),
        'graph TD\r\n    A --> B',
        'utf-8',
      );

      const markdown = '![](image.png "mdword::my-doc::diagram-1.mmd")';
      const result = await restoreMermaidDiagrams(markdown, tempDir, assetsDir);

      expect(result).not.toContain('\r\n');
      expect(result).toContain('graph TD\n    A --> B');

      await fs.remove(path.join(os.homedir(), '.mdword', 'assets', 'my-doc'));
    });
  });
});
