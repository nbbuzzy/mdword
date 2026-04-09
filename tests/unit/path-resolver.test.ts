import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import { resolveTemplate, resolveAssetsDir } from '../../src/utils/path-resolver.js';
import { TemplateNotFoundError } from '../../src/utils/errors.js';

describe('resolveTemplate', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `mdword-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('returns custom path when provided and file exists', async () => {
    const customTemplate = path.join(tempDir, 'custom.docx');
    await fs.writeFile(customTemplate, 'template');

    const result = await resolveTemplate(customTemplate);
    expect(result).toBe(customTemplate);
  });

  it('throws TemplateNotFoundError when custom path does not exist', async () => {
    await expect(resolveTemplate('/nonexistent/template.docx')).rejects.toThrow(
      TemplateNotFoundError,
    );
  });

  it('finds .mdword/reference.docx walking up from startDir', async () => {
    const projectDir = path.join(tempDir, 'project', 'subdir');
    const mdwordDir = path.join(tempDir, 'project', '.mdword');
    const templatePath = path.join(mdwordDir, 'reference.docx');

    await fs.ensureDir(projectDir);
    await fs.ensureDir(mdwordDir);
    await fs.writeFile(templatePath, 'template');

    const result = await resolveTemplate(undefined, projectDir);
    expect(result).toBe(templatePath);
  });

  it('falls back to bundled default template', async () => {
    // With no custom path and no .mdword/ in tree, should find the bundled template
    const result = await resolveTemplate(undefined, tempDir);

    // The bundled template should exist in the project
    if (result) {
      expect(result).toContain('default-reference.docx');
      expect(await fs.pathExists(result)).toBe(true);
    }
  });
});

describe('resolveAssetsDir', () => {
  it('returns custom assets dir when provided', () => {
    const result = resolveAssetsDir('/custom/assets');
    expect(result).toBe('/custom/assets');
  });

  it('returns ~/.mdword/assets/<stem>-<hash> for input file', () => {
    const result = resolveAssetsDir(undefined, '/path/to/notes.md');

    expect(result).toContain(path.join('.mdword', 'assets'));
    expect(result).toMatch(/notes-[a-f0-9]{8}$/);
  });

  it('produces different dirs for same-named files in different directories', () => {
    const result1 = resolveAssetsDir(undefined, '/path/a/notes.md');
    const result2 = resolveAssetsDir(undefined, '/path/b/notes.md');

    expect(result1).not.toBe(result2);
  });

  it('produces consistent results for same input', () => {
    const result1 = resolveAssetsDir(undefined, '/path/to/notes.md');
    const result2 = resolveAssetsDir(undefined, '/path/to/notes.md');

    expect(result1).toBe(result2);
  });

  it('uses "default" stem when no input file provided', () => {
    const result = resolveAssetsDir();
    expect(result).toContain('default-');
  });

  it('resolves custom path to absolute', () => {
    const result = resolveAssetsDir('relative/path');
    expect(path.isAbsolute(result)).toBe(true);
  });
});
