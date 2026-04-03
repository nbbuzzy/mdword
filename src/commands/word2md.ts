import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { validateDocxInput, validateMarkdownOutput } from '../utils/validation.js';
import { resolveAssetsDir } from '../utils/path-resolver.js';
import { createTempFile, cleanup } from '../utils/file-utils.js';
import { runPandoc } from '../core/pandoc-runner.js';
import { restoreMermaidDiagrams } from '../core/mermaid-restorer.js';
import { normalizeMarkdown } from '../core/normalizer.js';

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

  try {
    // 1. Validate inputs
    if (options.verbose) {
      console.log(chalk.blue('Validating inputs...'));
    }
    await validateDocxInput(inputDocx);
    await validateMarkdownOutput(outputMd);

    // 2. Resolve assets directory
    const assetsDir = resolveAssetsDir(options.assetsDir, outputMd);
    if (options.verbose) {
      console.log(chalk.gray(`Assets directory: ${assetsDir}`));
    }

    // 3. Create temp raw markdown file
    if (options.verbose) {
      console.log(chalk.blue('Creating temporary markdown file...'));
    }
    tempMd = await createTempFile('', '.md');

    // 4. Run pandoc conversion
    if (options.verbose) {
      console.log(chalk.blue('Running pandoc conversion...'));
    }
    await runPandoc({
      input: inputDocx,
      output: tempMd,
      format: 'markdown',
      extraArgs: ['--atx-headers', '--wrap=none'],
    });

    // 5. Read raw markdown
    if (options.verbose) {
      console.log(chalk.blue('Reading converted markdown...'));
    }
    let rawMarkdown = await fs.readFile(tempMd, 'utf-8');

    // 6. Restore mermaid diagrams from comments
    if (options.verbose) {
      console.log(chalk.blue('Restoring mermaid diagrams...'));
    }
    const baseDir = path.dirname(path.resolve(outputMd));
    const restoredMarkdown = await restoreMermaidDiagrams(rawMarkdown, baseDir);

    // 7. Normalize output (unless disabled)
    let finalMarkdown = restoredMarkdown;
    if (!options.noNormalize) {
      if (options.verbose) {
        console.log(chalk.blue('Normalizing markdown...'));
      }
      finalMarkdown = normalizeMarkdown(restoredMarkdown);
    }

    // 8. Write final output
    if (options.verbose) {
      console.log(chalk.blue('Writing output file...'));
    }
    await fs.writeFile(outputMd, finalMarkdown, 'utf-8');

    // 9. Success
    console.log(chalk.green(`✓ Converted ${inputDocx} → ${outputMd}`));
  } finally {
    // 10. Cleanup temp files
    if (tempMd) {
      await cleanup(tempMd);
    }
  }
}
