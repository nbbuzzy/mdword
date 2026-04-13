import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileExists } from '../utils/file-utils.js';
import { MermaidRenderError, DependencyError } from '../utils/errors.js';
import type { ExtractedDiagram } from './mermaid-extractor.js';

const execFileAsync = promisify(execFile);

/**
 * Check if mmdc (mermaid-cli) is installed
 */
export async function checkMermaidInstalled(): Promise<void> {
  try {
    await execFileAsync('mmdc', ['--version'], { shell: process.platform === 'win32' });
  } catch (error) {
    throw new DependencyError(
      'mmdc',
      '  npm install -g @mermaid-js/mermaid-cli\n' +
      '  or\n' +
      '  yarn global add @mermaid-js/mermaid-cli'
    );
  }
}

/**
 * Render a single mermaid diagram to PNG
 */
export async function renderSingleDiagram(diagram: ExtractedDiagram): Promise<void> {
  // Check if PNG already exists and .mmd hasn't changed
  // For now, we'll always regenerate
  // TODO: Add timestamp comparison for optimization

  try {
    const { stderr } = await execFileAsync('mmdc', ['-i', diagram.mmdPath, '-o', diagram.pngPath], {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      shell: process.platform === 'win32',
    });

    // Check if PNG was actually created
    if (!(await fileExists(diagram.pngPath))) {
      throw new MermaidRenderError(
        `Failed to render diagram ${diagram.id}`,
        diagram.id,
        stderr
      );
    }
  } catch (error: any) {
    if (error instanceof MermaidRenderError) {
      throw error;
    }

    throw new MermaidRenderError(
      `Failed to render diagram ${diagram.id}: ${error.message}`,
      diagram.id,
      error.stderr || error.message
    );
  }
}

/**
 * Render all mermaid diagrams to PNG
 */
export async function renderMermaidDiagrams(diagrams: ExtractedDiagram[]): Promise<void> {
  if (diagrams.length === 0) {
    return;
  }

  // Check if mmdc is installed before rendering any diagrams
  await checkMermaidInstalled();

  // Render diagrams sequentially to avoid overwhelming the system
  // Could be parallelized with Promise.all if needed
  for (const diagram of diagrams) {
    await renderSingleDiagram(diagram);
  }
}
