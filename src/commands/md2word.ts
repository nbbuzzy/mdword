import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { validateMarkdownInput, validateDocxOutput } from '../utils/validation.js';
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
      if (templatePath) {
        console.log(chalk.gray(`Using template: ${templatePath}`));
      } else {
        console.log(chalk.gray('Using pandoc default styles (no template found)'));
      }
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

    // 6. Create temporary directory and copy images
    if (options.verbose) {
      console.log(chalk.blue('Preparing temporary workspace...'));
    }
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
    if (options.verbose) {
      console.log(chalk.blue('Running pandoc conversion...'));
    }
    await runPandoc({
      input: path.basename(tempMdPath),  // Use relative path from temp dir
      output: path.resolve(outputDocx),  // Use absolute path for output
      referenceDoc: templatePath,
      format: 'docx',
      cwd: tempDir,  // Run from temp directory
    });

    // 8. Success
    console.log(chalk.green(`✓ Converted ${inputMd} → ${outputDocx}`));
    if (diagrams.length > 0) {
      console.log(chalk.gray(`  ${diagrams.length} mermaid diagram(s) processed`));
    }
  } finally {
    // 9. Cleanup temp directory
    if (tempDir) {
      await cleanup(tempDir);
    }
  }
}
