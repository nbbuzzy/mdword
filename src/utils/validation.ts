import fs from 'fs-extra';
import path from 'path';
import { ValidationError } from './errors.js';
import { fileExists } from './file-utils.js';

/**
 * Validate that an input file exists and is readable
 */
export async function validateInputFile(filePath: string): Promise<void> {
  if (!filePath) {
    throw new ValidationError('Input file path is required');
  }

  const resolvedPath = path.resolve(filePath);

  if (!(await fileExists(resolvedPath))) {
    throw new ValidationError(`Input file not found: ${filePath}`);
  }

  try {
    await fs.access(resolvedPath, fs.constants.R_OK);
  } catch {
    throw new ValidationError(`Input file is not readable: ${filePath}`);
  }
}

/**
 * Validate that an output path is writable
 */
export async function validateOutputPath(filePath: string): Promise<void> {
  if (!filePath) {
    throw new ValidationError('Output file path is required');
  }

  const resolvedPath = path.resolve(filePath);
  const dir = path.dirname(resolvedPath);

  // Check if directory exists and is writable
  try {
    await fs.ensureDir(dir);
    await fs.access(dir, fs.constants.W_OK);
  } catch {
    throw new ValidationError(`Output directory is not writable: ${dir}`);
  }

  // If file already exists, check if it's writable
  if (await fileExists(resolvedPath)) {
    try {
      await fs.access(resolvedPath, fs.constants.W_OK);
    } catch {
      throw new ValidationError(`Output file exists but is not writable: ${filePath}`);
    }
  }
}

/**
 * Validate file extension
 */
export function validateExtension(
  filePath: string,
  expectedExtension: string
): void {
  const ext = path.extname(filePath).toLowerCase();
  const expected = expectedExtension.startsWith('.')
    ? expectedExtension.toLowerCase()
    : `.${expectedExtension.toLowerCase()}`;

  if (ext !== expected) {
    throw new ValidationError(
      `Invalid file extension. Expected ${expected}, got ${ext || '(none)'}`
    );
  }
}

/**
 * Validate markdown input file
 */
export async function validateMarkdownInput(filePath: string): Promise<void> {
  await validateInputFile(filePath);
  validateExtension(filePath, '.md');
}

/**
 * Validate docx input file
 */
export async function validateDocxInput(filePath: string): Promise<void> {
  await validateInputFile(filePath);
  validateExtension(filePath, '.docx');
}

/**
 * Validate markdown output path
 */
export async function validateMarkdownOutput(filePath: string): Promise<void> {
  await validateOutputPath(filePath);
  validateExtension(filePath, '.md');
}

/**
 * Validate docx output path
 */
export async function validateDocxOutput(filePath: string): Promise<void> {
  await validateOutputPath(filePath);
  validateExtension(filePath, '.docx');
}
