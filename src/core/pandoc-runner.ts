import { exec } from 'child_process';
import { promisify } from 'util';
import { PandocError, DependencyError } from '../utils/errors.js';

const execAsync = promisify(exec);

interface PandocOptions {
  input: string;
  output: string;
  format: 'docx' | 'markdown';
  referenceDoc?: string;
  extraArgs?: string[];
}

/**
 * Check if pandoc is installed
 */
export async function checkPandocInstalled(): Promise<void> {
  try {
    await execAsync('pandoc --version');
  } catch (error) {
    throw new DependencyError(
      'pandoc',
      '  macOS:   brew install pandoc\n' +
      '  Ubuntu:  sudo apt install pandoc\n' +
      '  Windows: Download from https://pandoc.org/installing.html'
    );
  }
}

/**
 * Run pandoc conversion
 */
export async function runPandoc(options: PandocOptions): Promise<void> {
  // Check if pandoc is installed
  await checkPandocInstalled();

  // Build command arguments
  const args: string[] = [
    `"${options.input}"`,
    '-o',
    `"${options.output}"`,
  ];

  if (options.format === 'docx' && options.referenceDoc) {
    args.push(`--reference-doc="${options.referenceDoc}"`);
  }

  // Always use --wrap=none to prevent line wrapping
  args.push('--wrap=none');

  // For markdown output, use ATX headers
  if (options.format === 'markdown') {
    args.push('--atx-headers');
  }

  // Add any extra arguments
  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }

  const command = `pandoc ${args.join(' ')}`;

  try {
    const { stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Pandoc writes warnings to stderr even on success
    if (stderr && !stderr.includes('[WARNING]')) {
      // Only throw if it's not just warnings
      throw new PandocError('Pandoc conversion failed', stderr);
    }
  } catch (error: any) {
    if (error instanceof PandocError) {
      throw error;
    }

    throw new PandocError(
      `Pandoc conversion failed: ${error.message}`,
      error.stderr || error.message
    );
  }
}
