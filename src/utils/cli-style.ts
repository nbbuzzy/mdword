import chalk from 'chalk';

const bullet = chalk.hex('#a78bfa').bold('›');
const arrow = chalk.dim('→');

/**
 * Verbose pipeline step (leading glyph + high-contrast label).
 */
export function logStep(message: string): void {
  console.log(`${bullet} ${chalk.bold.white(message)}`);
}

/**
 * Secondary detail line under a step.
 */
export function logDetail(message: string): void {
  console.log(chalk.dim(`    ${message}`));
}

/**
 * Conversion finished: clear success block with emphasized paths.
 */
export function logConversionSuccess(from: string, to: string, footnotes?: string[]): void {
  const mark = chalk.green.bold('✓');
  console.log('');
  console.log(`${mark} ${chalk.bold.green('Done')}`);
  console.log(`  ${chalk.cyan(from)} ${arrow} ${chalk.cyan(to)}`);
  for (const line of footnotes ?? []) {
    logDetail(line);
  }
  console.log('');
}

/**
 * Formatted MdWord / generic CLI error for stderr.
 */
export function formatCliError(label: string, message: string): string {
  const mark = chalk.red.bold('✗');
  return `\n${mark} ${chalk.red.bold(label)}${chalk.red(`: ${message}`)}\n`;
}
