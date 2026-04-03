#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { md2word } from './commands/md2word.js';
import { word2md } from './commands/word2md.js';
import { MdWordError } from './utils/errors.js';

const program = new Command();

program
  .name('mdword')
  .description('Bidirectional markdown ↔ Word conversion with mermaid diagram support')
  .version('0.1.0');

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
    console.error(chalk.red(`\n✗ ${error.name}: ${error.message}\n`));
    process.exit(1);
  } else if (error instanceof Error) {
    console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  } else {
    console.error(chalk.red('\n✗ Unknown error occurred\n'));
    process.exit(1);
  }
}

// Parse command line arguments
program.parse();
