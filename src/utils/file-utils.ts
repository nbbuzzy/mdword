import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { randomBytes } from 'crypto';

/**
 * Create a temporary file with optional content and extension
 */
export async function createTempFile(
  content?: string,
  extension?: string
): Promise<string> {
  const tmpDir = os.tmpdir();
  const randomName = `mdword-${randomBytes(8).toString('hex')}${extension || ''}`;
  const tempPath = path.join(tmpDir, randomName);

  if (content) {
    await fs.writeFile(tempPath, content, 'utf-8');
  } else {
    await fs.ensureFile(tempPath);
  }

  return tempPath;
}

/**
 * Clean up temporary files
 */
export async function cleanup(...filePaths: string[]): Promise<void> {
  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        await fs.remove(filePath);
      } catch (error) {
        // Silently ignore cleanup errors
      }
    })
  );
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the relative path from one file to another
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(path.dirname(from), to);
}

/**
 * Resolve a path relative to the current working directory
 */
export function resolvePath(inputPath: string): string {
  return path.resolve(process.cwd(), inputPath);
}

/**
 * Get the directory containing a file
 */
export function getDirectory(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Check if a path is absolute
 */
export function isAbsolute(inputPath: string): boolean {
  return path.isAbsolute(inputPath);
}

/**
 * Join path segments
 */
export function joinPaths(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Get file extension
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * Get base filename without extension
 */
export function getBasename(filePath: string, ext?: string): string {
  return path.basename(filePath, ext);
}
