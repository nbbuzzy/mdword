import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export interface ConversionProgress {
  phase(text: string): void;
  /** Clears the spinner line; safe to call more than once. */
  stop(): void;
}

/**
 * Animated loading line for long-running conversion. No-op when verbose (use log steps instead).
 */
export function createConversionProgress(
  prefix: 'md2word' | 'word2md',
  verbose: boolean
): ConversionProgress {
  if (verbose) {
    return { phase: () => {}, stop: () => {} };
  }

  const spinner: Ora = ora({
    text: 'Validating inputs…',
    prefixText: chalk.dim(prefix),
    spinner: 'dots',
    color: 'magenta',
  }).start();

  return {
    phase(text: string) {
      spinner.text = text;
    },
    stop() {
      spinner.stop();
    },
  };
}
