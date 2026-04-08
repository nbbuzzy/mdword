import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import chalk from 'chalk';

/**
 * Restore mermaid diagrams from image alt text by reading .mmd files
 * and replacing the image reference with the original fence block.
 *
 * Supports two encoding schemes:
 * - New: mdword::diagram-1.mmd (filename resolved against assetsDir)
 * - Legacy: path::to::diagram-1.mmd (full relative path with :: separators, resolved against cwd)
 */
export async function restoreMermaidDiagrams(
  markdown: string,
  baseDir: string,
  assetsDir?: string
): Promise<string> {
  // Match three patterns for encoded .mmd paths:
  // 1. Alt text pattern (from docx round-trip): ![path::to::diagram.mmd](image-path)
  // 2. Markdown title pattern: ![](image-path "path::to::diagram.mmd")
  // 3. HTML img tag pattern (pandoc GFM output): <img src="..." title="path::to::diagram.mmd" ... />
  // All contain :: separators and end with .mmd
  const altTextPattern = /!\[([^[\]]*::[^[\]]*\.mmd)\]\([^)]+\)/g;
  const titlePattern = /!\[\]\([^)]+\s+"([^"]*::[^"]*\.mmd)"\)/g;
  const imgTagPattern = /<img\s[^>]*?title="([^"]*::[^"]*\.mmd)"[^>]*?\/?>/g;

  let restoredMarkdown = markdown;
  const matches: Array<{ fullMatch: string; encodedPath: string; offset: number }> = [];

  let match;
  while ((match = altTextPattern.exec(markdown)) !== null) {
    matches.push({
      fullMatch: match[0],
      encodedPath: match[1],
      offset: match.index,
    });
  }
  while ((match = titlePattern.exec(markdown)) !== null) {
    if (!matches.some(m => m.offset === match!.index)) {
      matches.push({
        fullMatch: match[0],
        encodedPath: match[1],
        offset: match.index,
      });
    }
  }
  while ((match = imgTagPattern.exec(markdown)) !== null) {
    if (!matches.some(m => m.offset === match!.index)) {
      matches.push({
        fullMatch: match[0],
        encodedPath: match[1],
        offset: match.index,
      });
    }
  }

  // Process matches in reverse order to maintain correct offsets
  for (const { fullMatch, encodedPath } of matches.reverse()) {
    let resolvedMmdPath: string;

    if (encodedPath.startsWith('mdword::')) {
      // New encoding: mdword::<subdir>::diagram-1.mmd
      // The subdir is the assets subdirectory name under ~/.mdword/assets/
      const parts = encodedPath.slice('mdword::'.length).split('::');
      if (parts.length >= 2) {
        const subdir = parts[0];
        const filename = parts.slice(1).join('::');
        resolvedMmdPath = path.join(os.homedir(), '.mdword', 'assets', subdir, filename);
      } else {
        // Single part after mdword:: — fallback to assetsDir or cwd
        const filename = parts[0];
        resolvedMmdPath = assetsDir
          ? path.join(assetsDir, filename)
          : path.resolve(process.cwd(), filename);
      }
    } else {
      // Legacy encoding: full relative path with :: separators
      const decodedPath = encodedPath.split('::').join(path.sep);
      resolvedMmdPath = path.resolve(process.cwd(), decodedPath);
    }

    try {
      // Read the .mmd file
      const mermaidContent = (await fs.readFile(resolvedMmdPath, 'utf-8')).replace(/\r\n/g, '\n');

      // Create the fence block replacement
      const replacement = `\`\`\`mermaid\n${mermaidContent.trim()}\n\`\`\``;

      // Replace the image with the fence block
      restoredMarkdown = restoredMarkdown.replace(fullMatch, replacement);
    } catch (error) {
      // If .mmd file doesn't exist, leave the image in place
      console.warn(
        chalk.yellow(`Warning: Could not read mermaid source file: ${resolvedMmdPath}`),
      );
    }
  }

  return restoredMarkdown;
}
