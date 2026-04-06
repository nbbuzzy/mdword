import fs from 'fs-extra';
import path from 'path';
import { ensureDir, getRelativePath } from '../utils/file-utils.js';

export interface ExtractedDiagram {
  id: string;              // e.g., "diagram-1"
  mmdPath: string;         // e.g., "assets/diagrams/diagram-1.mmd"
  pngPath: string;         // e.g., "assets/diagrams/diagram-1.png"
  content: string;         // Original mermaid code
  sourceLocation: number;  // Line number in original (approximate)
}

export interface ExtractionResult {
  processedMarkdown: string;
  diagrams: ExtractedDiagram[];
}

/**
 * Extract mermaid diagrams from markdown, write to .mmd files,
 * and replace with sidecar comments + image references
 */
export async function extractMermaidDiagrams(
  inputPath: string,
  assetsDir: string
): Promise<ExtractionResult> {
  // Read the markdown file
  const markdown = await fs.readFile(inputPath, 'utf-8');

  // Ensure assets directory exists
  await ensureDir(assetsDir);

  // Find all mermaid blocks using regex
  // Pattern: ```mermaid\n...\n```
  const mermaidPattern = /```mermaid\n([\s\S]*?)```/g;

  const diagrams: ExtractedDiagram[] = [];
  let diagramCounter = 1;
  let processedMarkdown = markdown;
  let match;

  // Find existing diagram files to continue numbering
  const existingFiles = await fs.readdir(assetsDir).catch(() => []);
  const existingNumbers = existingFiles
    .filter(f => f.match(/^diagram-(\d+)\.mmd$/))
    .map(f => parseInt(f.match(/^diagram-(\d+)\.mmd$/)![1], 10));

  if (existingNumbers.length > 0) {
    diagramCounter = Math.max(...existingNumbers) + 1;
  }

  // Reset regex
  mermaidPattern.lastIndex = 0;

  // Process each mermaid block
  const replacements: Array<{ original: string; replacement: string; diagram: ExtractedDiagram }> = [];

  while ((match = mermaidPattern.exec(markdown)) !== null) {
    const fullMatch = match[0];
    const mermaidContent = match[1].trim();
    const id = `diagram-${diagramCounter}`;

    const mmdFilename = `${id}.mmd`;
    const pngFilename = `${id}.png`;
    const mmdPath = path.join(assetsDir, mmdFilename);
    const pngPath = path.join(assetsDir, pngFilename);

    // Write mermaid source to .mmd file
    await fs.writeFile(mmdPath, mermaidContent, 'utf-8');

    // Get path relative to project root (cwd) for alt text
    // This ensures paths work regardless of where input/output files are located
    const relativeMmdPath = path.relative(process.cwd(), mmdPath);
    const absolutePngPath = path.resolve(pngPath);

    // Encode path with :: separator to survive Word round-trip (no "/" corruption)
    // Use clean encoding without prefix to avoid showing metadata in Word doc
    // Example: mdword-assets/diagram-1.mmd -> mdword-assets::diagram-1.mmd
    const encodedPath = relativeMmdPath.split(path.sep).join('::');

    // Create replacement: image with encoded .mmd path in title attribute
    // Use absolute path for image so pandoc can find it from temp file location
    // Title attribute maps to docx image description (invisible), not a visible caption
    // On round-trip, pandoc reads the description back into alt text for the restorer
    const replacement = `![](${absolutePngPath} "${encodedPath}")`;

    const diagram: ExtractedDiagram = {
      id,
      mmdPath,
      pngPath,
      content: mermaidContent,
      sourceLocation: markdown.substring(0, match.index).split('\n').length,
    };

    replacements.push({ original: fullMatch, replacement, diagram });
    diagrams.push(diagram);

    diagramCounter++;
  }

  // Apply all replacements
  for (const { original, replacement } of replacements) {
    processedMarkdown = processedMarkdown.replace(original, replacement);
  }

  return {
    processedMarkdown,
    diagrams,
  };
}
