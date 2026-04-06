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
    // Decode the path: replace :: with / (or appropriate path separator)
    // Example: mdword-assets::diagram-1.mmd -> mdword-assets/diagram-1.mmd
    const decodedPath = encodedPath.split('::').join(path.sep);

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
