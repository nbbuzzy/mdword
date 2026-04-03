import fs from 'fs-extra';
import path from 'path';

/**
 * Restore mermaid diagrams from sidecar comments by reading .mmd files
 * and replacing the comment + image reference with the original fence block
 */
export async function restoreMermaidDiagrams(
  markdown: string,
  baseDir: string
): Promise<string> {
  // Pattern to match: <!-- mermaid:path/to/diagram.mmd -->\n![...](...)
  const mermaidPattern = /<!-- mermaid:(.+?\.mmd) -->\s*!\[.*?\]\(.*?\)/g;

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
    // Resolve .mmd path relative to baseDir
    const resolvedMmdPath = path.resolve(baseDir, mmdPath);

    try {
      // Read the .mmd file
      const mermaidContent = await fs.readFile(resolvedMmdPath, 'utf-8');

      // Create the fence block replacement
      const replacement = `\`\`\`mermaid\n${mermaidContent.trim()}\n\`\`\``;

      // Replace the comment + image with the fence block
      restoredMarkdown = restoredMarkdown.replace(fullMatch, replacement);
    } catch (error) {
      // If .mmd file doesn't exist, leave the comment/image in place
      console.warn(`Warning: Could not read mermaid source file: ${resolvedMmdPath}`);
    }
  }

  return restoredMarkdown;
}
