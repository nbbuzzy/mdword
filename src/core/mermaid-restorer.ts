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
  // Pattern to match: ![path/to/diagram.mmd](image-path)
  // The alt text contains the .mmd path which survives round-trip through Word
  const mermaidPattern = /!\[([^[\]]+\.mmd)\]\([^)]+\)/g;

  let restoredMarkdown = markdown;
  const matches: Array<{ fullMatch: string; mmdPath: string; offset: number }> = [];

  let match;
  while ((match = mermaidPattern.exec(markdown)) !== null) {
    matches.push({
      fullMatch: match[0],
      mmdPath: match[1],
      offset: match.index,
    });
  }

  // Process matches in reverse order to maintain correct offsets
  for (const { fullMatch, mmdPath } of matches.reverse()) {
    // Resolve .mmd path relative to project root (cwd)
    // Paths in alt text are stored relative to cwd, not to the file location
    const resolvedMmdPath = path.resolve(process.cwd(), mmdPath);

    try {
      // Read the .mmd file
      const mermaidContent = await fs.readFile(resolvedMmdPath, 'utf-8');

      // Create the fence block replacement
      const replacement = `\`\`\`mermaid\n${mermaidContent.trim()}\n\`\`\``;

      // Replace the comment + image with the fence block
      restoredMarkdown = restoredMarkdown.replace(fullMatch, replacement);
    } catch (error) {
      // If .mmd file doesn't exist, leave the comment/image in place
      console.warn(
        chalk.yellow(`Warning: Could not read mermaid source file: ${resolvedMmdPath}`),
      );
    }
  }

  return restoredMarkdown;
}
