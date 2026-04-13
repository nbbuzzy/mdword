import { execFile } from 'child_process';
import { promisify } from 'util';
import { PandocError, DependencyError } from '../utils/errors.js';

const execFileAsync = promisify(execFile);

interface PandocOptions {
  input: string;
  output: string;
  format: 'docx' | 'markdown';
  referenceDoc?: string;
  extraArgs?: string[];
  cwd?: string;  // Working directory to run pandoc from
}

/**
 * Check if pandoc is installed
 */
export async function checkPandocInstalled(): Promise<void> {
  try {
    await execFileAsync('pandoc', ['--version'], { shell: process.platform === 'win32' });
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

  // Build command arguments as an array (no shell interpretation)
  const args: string[] = [
    options.input,
    '-o',
    options.output,
  ];

  if (options.format === 'docx' && options.referenceDoc) {
    args.push(`--reference-doc=${options.referenceDoc}`);
  }

  // For markdown output, use GFM (GitHub Flavored Markdown) for better tables and formatting
  if (options.format === 'markdown') {
    args.push('--to=gfm');
    args.push('--markdown-headings=atx');
  }

  // Always use --wrap=none to prevent line wrapping
  args.push('--wrap=none');

  // Add any extra arguments
  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }

  try {
    const { stderr } = await execFileAsync('pandoc', args, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      cwd: options.cwd,  // Run from specified directory
      shell: process.platform === 'win32',
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
