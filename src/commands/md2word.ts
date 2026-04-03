import fs from 'fs-extra';
import chalk from 'chalk';
import { validateMarkdownInput, validateDocxOutput } from '../utils/validation.js';
import { resolveTemplate, resolveAssetsDir } from '../utils/path-resolver.js';
import { createTempFile, cleanup } from '../utils/file-utils.js';
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
  let tempMd: string | undefined;

  try {
    // 1. Validate inputs
    if (options.verbose) {
      console.log(chalk.blue('Validating inputs...'));
    }
    await validateMarkdownInput(inputMd);
    await validateDocxOutput(outputDocx);

    // 2. Resolve template path
    if (options.verbose) {
      console.log(chalk.blue('Resolving template...'));
    }
    const templatePath = await resolveTemplate(options.template);
    if (options.verbose) {
      console.log(chalk.gray(`Using template: ${templatePath}`));
    }

    // 3. Resolve assets directory
    const assetsDir = resolveAssetsDir(options.assetsDir, inputMd);
    if (options.verbose) {
      console.log(chalk.gray(`Assets directory: ${assetsDir}`));
    }

    // 4. Extract mermaid diagrams
    if (options.verbose) {
      console.log(chalk.blue('Extracting mermaid diagrams...'));
    }
    const { processedMarkdown, diagrams } = await extractMermaidDiagrams(
      inputMd,
      assetsDir
    );
    if (options.verbose && diagrams.length > 0) {
      console.log(chalk.gray(`Found ${diagrams.length} mermaid diagram(s)`));
    }

    // 5. Render diagrams to PNG
    if (diagrams.length > 0) {
      if (options.verbose) {
        console.log(chalk.blue('Rendering mermaid diagrams to PNG...'));
      }
      await renderMermaidDiagrams(diagrams);
      if (options.verbose) {
        console.log(chalk.gray(`Rendered ${diagrams.length} diagram(s)`));
      }
    }

    // 6. Create temporary processed markdown file
    if (options.verbose) {
      console.log(chalk.blue('Creating temporary markdown file...'));
    }
    tempMd = await createTempFile(processedMarkdown, '.md');

    // 7. Run pandoc conversion
    if (options.verbose) {
      console.log(chalk.blue('Running pandoc conversion...'));
    }
    await runPandoc({
      input: tempMd,
      output: outputDocx,
      referenceDoc: templatePath,
      format: 'docx',
    });

    // 8. Success
    console.log(chalk.green(`✓ Converted ${inputMd} → ${outputDocx}`));
    if (diagrams.length > 0) {
      console.log(chalk.gray(`  ${diagrams.length} mermaid diagram(s) processed`));
    }
  } finally {
    // 9. Cleanup temp files
    if (tempMd) {
      await cleanup(tempMd);
    }
  }
}
