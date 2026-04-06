#!/usr/bin/env node

import { Command } from 'commander';
import { createRequire } from 'module';
import chalk from 'chalk';
import { md2word } from './commands/md2word.js';
import { word2md } from './commands/word2md.js';
import { MdWordError } from './utils/errors.js';
import { formatCliError } from './utils/cli-style.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .configureOutput({
    outputError: (str, write) => {
      write(chalk.red(str));
    },
  })
  .addHelpText(
    'beforeAll',
    () =>
      `\n${chalk.bold.cyan('mdword')}  ${chalk.dim('markdown ↔ Word  ·  mermaid diagrams')}\n`,
  );

program
  .name('mdword')
  .description('Bidirectional markdown ↔ Word conversion with mermaid diagram support')
  .version(pkg.version);

// md2word command
program
  .command('md2word')
  .description('Convert markdown to Word document')
  .argument('<input.md>', 'Input markdown file')
  .argument('<output.docx>', 'Output Word document')
  .option('-t, --template <path>', 'Custom reference.docx template path')
  .option('-a, --assets-dir <path>', 'Custom assets directory for diagrams')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (inputMd: string, outputDocx: string, options) => {
    try {
      await md2word(inputMd, outputDocx, options);
    } catch (error) {
      handleError(error);
    }
  });

// word2md command
program
  .command('word2md')
  .description('Convert Word document to markdown')
  .argument('<input.docx>', 'Input Word document')
  .argument('<output.md>', 'Output markdown file')
  .option('-a, --assets-dir <path>', 'Custom assets directory for diagrams')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--no-normalize', 'Disable markdown normalization')
  .action(async (inputDocx: string, outputMd: string, options) => {
    try {
      await word2md(inputDocx, outputMd, options);
    } catch (error) {
      handleError(error);
    }
  });

// Error handler
function handleError(error: unknown): void {
  if (error instanceof MdWordError) {
    console.error(formatCliError(error.name, error.message));
    process.exit(1);
  } else if (error instanceof Error) {
    console.error(formatCliError('Error', error.message));
    if (process.env.DEBUG) {
      console.error(chalk.dim(error.stack ?? ''));
    }
    process.exit(1);
  } else {
    console.error(formatCliError('Error', 'Unknown error occurred'));
    process.exit(1);
  }
}

// Parse command line arguments
program.parse();
