import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { fileExists } from './file-utils.js';
import { TemplateNotFoundError } from './errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the template path by walking up the directory tree
 * looking for .mdword/reference.docx
 *
 * Returns undefined if no template is found, allowing pandoc to use its defaults
 */
export async function resolveTemplate(
  customPath?: string,
  startDir?: string
): Promise<string | undefined> {
  // 1. If customPath provided, validate and return
  if (customPath) {
    const resolvedCustomPath = path.resolve(customPath);
    if (!(await fileExists(resolvedCustomPath))) {
      throw new TemplateNotFoundError([resolvedCustomPath]);
    }
    return resolvedCustomPath;
  }

  // 2. Walk up from startDir (or cwd) looking for .mdword/reference.docx
  let currentDir = startDir || process.cwd();
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const templatePath = path.join(currentDir, '.mdword', 'reference.docx');

    if (await fileExists(templatePath)) {
      return templatePath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Safety check
    currentDir = parentDir;
  }

  // 3. Fall back to bundled default template
  // The default template is at templates/default-reference.docx
  // From this file's location (src/utils/path-resolver.ts), we need to go up to project root
  const defaultTemplatePath = path.join(
    __dirname,
    '../../templates/default-reference.docx'
  );

  if (await fileExists(defaultTemplatePath)) {
    return defaultTemplatePath;
  }

  // 4. No template found - return undefined to use pandoc's defaults
  return undefined;
}

/**
 * Resolve the assets directory for diagrams.
 * Default: ~/.mdword/assets/<hash>/ where hash is derived from the input file's
 * absolute path. This keeps assets hidden and isolated per-file.
 */
export function resolveAssetsDir(
  customAssetsDir?: string,
  inputFilePath?: string
): string {
  if (customAssetsDir) {
    return path.resolve(customAssetsDir);
  }

  // Use <stem>-<hash> as the assets subdirectory, where hash is derived from the
  // full absolute path of the markdown file. This prevents collisions between
  // identically-named files in different directories while staying human-readable.
  // Example: notes-a1b2c3d4
  const resolved = inputFilePath
    ? path.resolve(inputFilePath)
    : process.cwd();
  const stem = inputFilePath
    ? path.basename(inputFilePath, path.extname(inputFilePath))
    : 'default';
  const hash = createHash('sha256')
    .update(resolved)
    .digest('hex')
    .slice(0, 8);

  return path.join(os.homedir(), '.mdword', 'assets', `${stem}-${hash}`);
}
