import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { randomBytes } from 'crypto';
import {
  validateInputFile,
  validateOutputPath,
  validateExtension,
  validateMarkdownInput,
  validateDocxInput,
  validateMarkdownOutput,
  validateDocxOutput,
} from '../../src/utils/validation.js';
import { ValidationError } from '../../src/utils/errors.js';

describe('validation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `mdword-test-valid-${randomBytes(6).toString('hex')}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('validateInputFile', () => {
    it('succeeds for existing readable file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'content');
      await expect(validateInputFile(filePath)).resolves.toBeUndefined();
    });

    it('throws ValidationError for empty path', async () => {
      await expect(validateInputFile('')).rejects.toThrow(ValidationError);
      await expect(validateInputFile('')).rejects.toThrow('required');
    });

    it('throws ValidationError for nonexistent file', async () => {
      await expect(validateInputFile('/nonexistent/file.txt')).rejects.toThrow(ValidationError);
      await expect(validateInputFile('/nonexistent/file.txt')).rejects.toThrow('not found');
    });
  });

  describe('validateOutputPath', () => {
    it('succeeds for writable directory', async () => {
      const filePath = path.join(tempDir, 'output.txt');
      await expect(validateOutputPath(filePath)).resolves.toBeUndefined();
    });

    it('throws ValidationError for empty path', async () => {
      await expect(validateOutputPath('')).rejects.toThrow(ValidationError);
      await expect(validateOutputPath('')).rejects.toThrow('required');
    });

    it('creates output directory if it does not exist', async () => {
      const filePath = path.join(tempDir, 'newdir', 'output.txt');
      await expect(validateOutputPath(filePath)).resolves.toBeUndefined();
      expect(await fs.pathExists(path.join(tempDir, 'newdir'))).toBe(true);
    });
  });

  describe('validateExtension', () => {
    it('passes for matching extension', () => {
      expect(() => validateExtension('file.md', '.md')).not.toThrow();
    });

    it('passes for extension without leading dot', () => {
      expect(() => validateExtension('file.md', 'md')).not.toThrow();
    });

    it('is case-insensitive', () => {
      expect(() => validateExtension('file.MD', '.md')).not.toThrow();
    });

    it('throws ValidationError for wrong extension', () => {
      expect(() => validateExtension('file.txt', '.md')).toThrow(ValidationError);
      expect(() => validateExtension('file.txt', '.md')).toThrow('Invalid file extension');
    });

    it('throws for file with no extension', () => {
      expect(() => validateExtension('file', '.md')).toThrow(ValidationError);
      expect(() => validateExtension('file', '.md')).toThrow('(none)');
    });
  });

  describe('validateMarkdownInput', () => {
    it('succeeds for existing .md file', async () => {
      const filePath = path.join(tempDir, 'test.md');
      await fs.writeFile(filePath, '# Hello');
      await expect(validateMarkdownInput(filePath)).resolves.toBeUndefined();
    });

    it('throws for non-.md file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'content');
      await expect(validateMarkdownInput(filePath)).rejects.toThrow('Invalid file extension');
    });

    it('throws for nonexistent .md file', async () => {
      await expect(validateMarkdownInput(path.join(tempDir, 'missing.md'))).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('validateDocxInput', () => {
    it('succeeds for existing .docx file', async () => {
      const filePath = path.join(tempDir, 'test.docx');
      await fs.writeFile(filePath, 'content');
      await expect(validateDocxInput(filePath)).resolves.toBeUndefined();
    });

    it('throws for non-.docx file', async () => {
      const filePath = path.join(tempDir, 'test.md');
      await fs.writeFile(filePath, 'content');
      await expect(validateDocxInput(filePath)).rejects.toThrow('Invalid file extension');
    });
  });

  describe('validateMarkdownOutput', () => {
    it('succeeds for .md output path in writable directory', async () => {
      const filePath = path.join(tempDir, 'output.md');
      await expect(validateMarkdownOutput(filePath)).resolves.toBeUndefined();
    });

    it('throws for non-.md output path', async () => {
      await expect(validateMarkdownOutput(path.join(tempDir, 'output.docx'))).rejects.toThrow(
        'Invalid file extension',
      );
    });
  });

  describe('validateDocxOutput', () => {
    it('succeeds for .docx output path in writable directory', async () => {
      const filePath = path.join(tempDir, 'output.docx');
      await expect(validateDocxOutput(filePath)).resolves.toBeUndefined();
    });

    it('throws for non-.docx output path', async () => {
      await expect(validateDocxOutput(path.join(tempDir, 'output.md'))).rejects.toThrow(
        'Invalid file extension',
      );
    });
  });
});
