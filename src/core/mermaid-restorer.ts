import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Restore mermaid diagrams from image alt text by reading .mmd files
 * and replacing the image reference with the original fence block
 */
export async function restoreMermaidDiagrams(
  markdown: string,
  baseDir: string
): Promise<string> {
  // Pattern to match: ![mermaid::path::to::diagram.mmd](image-path)
  // The alt text contains the encoded .mmd path with :: separators
  const mermaidPattern = /!\[(mermaid::[^[\]]+)\]\([^)]+\)/g;

  let restoredMarkdown = markdown;
  const matches: Array<{ fullMatch: string; encodedPath: string; offset: number }> = [];

  let match;
  while ((match = mermaidPattern.exec(markdown)) !== null) {
    matches.push({
      fullMatch: match[0],
      encodedPath: match[1],
      offset: match.index,
    });
  }

  // Process matches in reverse order to maintain correct offsets
  for (const { fullMatch, encodedPath } of matches.reverse()) {
    // Decode the path: remove 'mermaid::' prefix and replace :: with /
    // Example: mermaid::assets::diagrams::diagram-1.mmd -> assets/diagrams/diagram-1.mmd
    const pathWithoutPrefix = encodedPath.replace(/^mermaid::/, '');
    const decodedPath = pathWithoutPrefix.split('::').join(path.sep);

    // Resolve .mmd path relative to project root (cwd)
    const resolvedMmdPath = path.resolve(process.cwd(), decodedPath);

    try {
      // Read the .mmd file
      const mermaidContent = await fs.readFile(resolvedMmdPath, 'utf-8');

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
