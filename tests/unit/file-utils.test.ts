import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  createTempDir,
  createTempFile,
  cleanup,
  fileExists,
  getRelativePath,
  resolvePath,
  getDirectory,
  isAbsolute,
  joinPaths,
  getExtension,
  getBasename,
} from '../../src/utils/file-utils.js';

describe('file-utils', () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    for (const p of cleanupPaths) {
      await fs.remove(p).catch(() => {});
    }
    cleanupPaths.length = 0;
  });

  describe('createTempDir', () => {
    it('creates a directory in the OS temp dir', async () => {
      const dir = await createTempDir();
      cleanupPaths.push(dir);

      expect(await fs.pathExists(dir)).toBe(true);
      expect((await fs.stat(dir)).isDirectory()).toBe(true);
      expect(dir).toContain('mdword-');
    });

    it('creates unique directories on each call', async () => {
      const dir1 = await createTempDir();
      const dir2 = await createTempDir();
      cleanupPaths.push(dir1, dir2);

      expect(dir1).not.toBe(dir2);
    });
  });

  describe('createTempFile', () => {
    it('creates an empty temp file', async () => {
      const filePath = await createTempFile();
      cleanupPaths.push(filePath);

      expect(await fs.pathExists(filePath)).toBe(true);
    });

    it('creates a temp file with content', async () => {
      const filePath = await createTempFile('hello world');
      cleanupPaths.push(filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('hello world');
    });

    it('creates a temp file with specified extension', async () => {
      const filePath = await createTempFile('content', '.md');
      cleanupPaths.push(filePath);

      expect(filePath).toMatch(/\.md$/);
    });
  });

  describe('cleanup', () => {
    it('removes files', async () => {
      const filePath = await createTempFile('content');
      expect(await fs.pathExists(filePath)).toBe(true);

      await cleanup(filePath);
      expect(await fs.pathExists(filePath)).toBe(false);
    });

    it('removes directories', async () => {
      const dir = await createTempDir();
      expect(await fs.pathExists(dir)).toBe(true);

      await cleanup(dir);
      expect(await fs.pathExists(dir)).toBe(false);
    });

    it('does not throw for nonexistent paths', async () => {
      await expect(cleanup('/nonexistent/path')).resolves.toBeUndefined();
    });

    it('handles multiple paths', async () => {
      const file1 = await createTempFile('a');
      const file2 = await createTempFile('b');

      await cleanup(file1, file2);
      expect(await fs.pathExists(file1)).toBe(false);
      expect(await fs.pathExists(file2)).toBe(false);
    });
  });

  describe('fileExists', () => {
    it('returns true for existing file', async () => {
      const filePath = await createTempFile('content');
      cleanupPaths.push(filePath);

      expect(await fileExists(filePath)).toBe(true);
    });

    it('returns false for nonexistent file', async () => {
      expect(await fileExists('/nonexistent/file.txt')).toBe(false);
    });
  });

  describe('path utilities', () => {
    it('getRelativePath returns relative path between files', () => {
      expect(getRelativePath('/a/b/file.md', '/a/b/c/other.md')).toBe('c/other.md');
    });

    it('resolvePath resolves against cwd', () => {
      const result = resolvePath('test.md');
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('test.md');
    });

    it('getDirectory returns parent directory', () => {
      expect(getDirectory('/a/b/file.md')).toBe('/a/b');
    });

    it('isAbsolute identifies absolute paths', () => {
      expect(isAbsolute('/absolute/path')).toBe(true);
      expect(isAbsolute('relative/path')).toBe(false);
    });

    it('joinPaths joins path segments', () => {
      expect(joinPaths('/a', 'b', 'c.md')).toBe('/a/b/c.md');
    });

    it('getExtension returns file extension', () => {
      expect(getExtension('file.md')).toBe('.md');
      expect(getExtension('file.tar.gz')).toBe('.gz');
      expect(getExtension('file')).toBe('');
    });

    it('getBasename returns filename', () => {
      expect(getBasename('/path/to/file.md')).toBe('file.md');
      expect(getBasename('/path/to/file.md', '.md')).toBe('file');
    });
  });
});
