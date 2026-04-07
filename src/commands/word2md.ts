import fs from 'fs-extra';
import path from 'path';
import { validateDocxInput, validateMarkdownOutput } from '../utils/validation.js';
import { logConversionSuccess, logDetail, logStep } from '../utils/cli-style.js';
import { createConversionProgress } from '../utils/cli-spinner.js';
import { resolveAssetsDir } from '../utils/path-resolver.js';
import { createTempFile, cleanup } from '../utils/file-utils.js';
import { runPandoc } from '../core/pandoc-runner.js';
import { restoreMermaidDiagrams } from '../core/mermaid-restorer.js';
import { normalizeMarkdown, convertFiguresToMarkdown } from '../core/normalizer.js';

export interface Word2MdOptions {
  assetsDir?: string;
  verbose?: boolean;
  noNormalize?: boolean;
}

/**
 * Convert Word document to markdown
 */
export async function word2md(
  inputDocx: string,
  outputMd: string,
  options: Word2MdOptions = {}
): Promise<void> {
  let tempMd: string | undefined;
  const progress = createConversionProgress('word2md', !!options.verbose);

  const step = (message: string) => {
    progress.phase(message);
    if (options.verbose) {
      logStep(message);
    }
  };

  try {
    // 1. Validate inputs
    step('Validating inputs…');
    await validateDocxInput(inputDocx);
    await validateMarkdownOutput(outputMd);

    // 2. Resolve assets directory
    const assetsDir = resolveAssetsDir(options.assetsDir, outputMd);
    if (options.verbose) {
      logDetail(`Assets: ${assetsDir}`);
    }

    // 3. Create temp raw markdown file
    step('Creating temporary markdown file…');
    tempMd = await createTempFile('', '.md');

    // 4. Run pandoc conversion
    step('Running pandoc conversion…');
    await runPandoc({
      input: inputDocx,
      output: tempMd,
      format: 'markdown',
    });

    // 5. Read raw markdown
    step('Reading converted markdown…');
    let rawMarkdown = (await fs.readFile(tempMd, 'utf-8')).replace(/\r\n/g, '\n');

    // 6. Pre-process: Convert HTML figures to markdown images (must happen before mermaid restoration)
    step('Converting HTML figures to markdown…');
    rawMarkdown = convertFiguresToMarkdown(rawMarkdown);

    // 7. Restore mermaid diagrams from image alt text
    step('Restoring mermaid diagrams…');
    const baseDir = path.dirname(path.resolve(outputMd));
    const restoredMarkdown = await restoreMermaidDiagrams(rawMarkdown, baseDir);

    // 8. Normalize output (unless disabled)
    let finalMarkdown = restoredMarkdown;
    if (!options.noNormalize) {
      step('Normalizing markdown…');
      finalMarkdown = normalizeMarkdown(restoredMarkdown);
    }

    // 9. Write final output
    step('Writing output file…');
    await fs.writeFile(outputMd, finalMarkdown, 'utf-8');

    // 10. Success
    progress.stop();
    logConversionSuccess(inputDocx, outputMd);
  } catch (error) {
    progress.stop();
    throw error;
  } finally {
    // 11. Cleanup temp files
    if (tempMd) {
      await cleanup(tempMd);
    }
  }
}
