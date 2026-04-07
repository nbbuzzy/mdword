import fs from 'fs-extra';
import path from 'path';
import { validateMarkdownInput, validateDocxOutput } from '../utils/validation.js';
import { logConversionSuccess, logDetail, logStep } from '../utils/cli-style.js';
import { createConversionProgress } from '../utils/cli-spinner.js';
import { resolveTemplate, resolveAssetsDir } from '../utils/path-resolver.js';
import { createTempDir, cleanup } from '../utils/file-utils.js';
import { extractMermaidDiagrams } from '../core/mermaid-extractor.js';
import { renderMermaidDiagrams } from '../core/mermaid-renderer.js';
import { runPandoc } from '../core/pandoc-runner.js';

export interface Md2WordOptions {
  template?: string;
  assetsDir?: string;
  verbose?: boolean;
}

/**
 * Convert markdown to Word document
 */
export async function md2word(
  inputMd: string,
  outputDocx: string,
  options: Md2WordOptions = {}
): Promise<void> {
  let tempDir: string | undefined;
  const progress = createConversionProgress('md2word', !!options.verbose);

  const step = (message: string) => {
    progress.phase(message);
    if (options.verbose) {
      logStep(message);
    }
  };

  try {
    // 1. Validate inputs
    step('Validating inputs…');
    await validateMarkdownInput(inputMd);
    await validateDocxOutput(outputDocx);

    // 2. Resolve template path
    step('Resolving template…');
    const templatePath = await resolveTemplate(options.template);
    if (options.verbose) {
      if (templatePath) {
        logDetail(`Template: ${templatePath}`);
      } else {
        logDetail('Using pandoc default styles (no template found)');
      }
    }

    // 3. Resolve assets directory
    const assetsDir = resolveAssetsDir(options.assetsDir, inputMd);
    if (options.verbose) {
      logDetail(`Assets: ${assetsDir}`);
    }

    // 4. Extract mermaid diagrams
    step('Extracting mermaid diagrams…');
    const { processedMarkdown, diagrams } = await extractMermaidDiagrams(
      inputMd,
      assetsDir
    );
    if (options.verbose && diagrams.length > 0) {
      logDetail(`Found ${diagrams.length} mermaid diagram(s)`);
    }

    // 5. Render diagrams to PNG
    if (diagrams.length > 0) {
      step(
        diagrams.length === 1
          ? 'Rendering diagram to PNG…'
          : `Rendering ${diagrams.length} diagrams to PNG…`
      );
      await renderMermaidDiagrams(diagrams);
      if (options.verbose) {
        logDetail(`Rendered ${diagrams.length} diagram(s)`);
      }
    }

    // 6. Create temporary directory and copy images
    step('Preparing workspace…');
    tempDir = await createTempDir();

    // Copy PNG files to temp directory and adjust markdown to use relative paths
    let finalMarkdown = processedMarkdown;
    for (const diagram of diagrams) {
      const pngFilename = path.basename(diagram.pngPath);
      const tempPngPath = path.join(tempDir, pngFilename);

      // Copy PNG to temp directory
      await fs.copyFile(diagram.pngPath, tempPngPath);

      // Replace absolute path in markdown with just the filename
      const absolutePath = path.resolve(diagram.pngPath);
      finalMarkdown = finalMarkdown.replace(absolutePath, pngFilename);
    }

    // Write processed markdown to temp directory
    const tempMdPath = path.join(tempDir, 'input.md');
    await fs.writeFile(tempMdPath, finalMarkdown, 'utf-8');

    // 7. Run pandoc conversion from temp directory (so it finds images)
    step('Running pandoc…');
    await runPandoc({
      input: path.basename(tempMdPath), // Use relative path from temp dir
      output: path.resolve(outputDocx), // Use absolute path for output
      referenceDoc: templatePath,
      format: 'docx',
      cwd: tempDir, // Run from temp directory
    });

    // 8. Success
    progress.stop();
    const footnotes =
      diagrams.length > 0 ? [`${diagrams.length} mermaid diagram(s) processed`] : undefined;
    logConversionSuccess(inputMd, outputDocx, footnotes);
  } catch (error) {
    progress.stop();
    throw error;
  } finally {
    // 9. Cleanup temp directory
    if (tempDir) {
      await cleanup(tempDir);
    }
  }
}
