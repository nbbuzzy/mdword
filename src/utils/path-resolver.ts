import path from 'path';
import { fileURLToPath } from 'url';
import { fileExists } from './file-utils.js';
import { TemplateNotFoundError } from './errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the template path by walking up the directory tree
 * looking for .mdword/reference.docx
 */
export async function resolveTemplate(
  customPath?: string,
  startDir?: string
): Promise<string> {
  const searchPaths: string[] = [];

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
    searchPaths.push(templatePath);

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

  // If we still haven't found it, throw an error
  searchPaths.push(defaultTemplatePath);
  throw new TemplateNotFoundError(searchPaths);
}

/**
 * Resolve the assets directory for diagrams
 */
export function resolveAssetsDir(
  customAssetsDir?: string,
  inputFilePath?: string
): string {
  if (customAssetsDir) {
    return path.resolve(customAssetsDir);
  }

  // Default to assets/diagrams relative to the input file's directory
  if (inputFilePath) {
    const inputDir = path.dirname(path.resolve(inputFilePath));
    return path.join(inputDir, 'assets', 'diagrams');
  }

  // Fallback to cwd
  return path.join(process.cwd(), 'assets', 'diagrams');
}
