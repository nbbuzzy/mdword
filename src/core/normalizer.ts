/**
 * Normalize markdown output to improve round-trip fidelity
 */
export function normalizeMarkdown(markdown: string): string {
  let normalized = markdown;

  // 1. Strip trailing whitespace from each line
  normalized = normalized.replace(/[ \t]+$/gm, '');

  // 2. Convert smart quotes to straight quotes
  normalized = normalized.replace(/[""]/g, '"');
  normalized = normalized.replace(/['']/g, "'");

  // 3. Convert em-dashes and en-dashes to hyphens
  normalized = normalized.replace(/[—–]/g, '-');

  // 4. Normalize line endings to \n
  normalized = normalized.replace(/\r\n/g, '\n');
  normalized = normalized.replace(/\r/g, '\n');

  // 5. Ensure single trailing newline
  normalized = normalized.replace(/\n*$/, '\n');

  // 6. Normalize multiple blank lines to maximum 2
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  // 7. Normalize list markers (prefer - over * or +)
  normalized = normalizeListMarkers(normalized);

  // 8. Normalize emphasis markers (prefer * over _)
  normalized = normalizeEmphasisMarkers(normalized);

  return normalized;
}

/**
 * Normalize list markers to use consistent style
 */
function normalizeListMarkers(markdown: string): string {
  // Convert * and + bullet points to -
  return markdown.replace(/^(\s*)[\*\+](\s+)/gm, '$1-$2');
}

/**
 * Normalize emphasis markers to use * instead of _
 */
function normalizeEmphasisMarkers(markdown: string): string {
  let normalized = markdown;

  // Bold: __ to **
  normalized = normalized.replace(/__(.*?)__/g, '**$1**');

  // Italic: _ to * (but avoid matching within words)
  // This is tricky - only replace if surrounded by whitespace or punctuation
  normalized = normalized.replace(/(^|\s|[^\w])_([^\s_].*?[^\s_])_($|\s|[^\w])/gm, '$1*$2*$3');

  return normalized;
}

/**
 * Normalize heading style (ensure ATX headers with space after #)
 */
export function normalizeHeadings(markdown: string): string {
  // Ensure space after # in headers
  return markdown.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
}

/**
 * Normalize code fence backticks to use consistent ``` style
 */
export function normalizeCodeFences(markdown: string): string {
  // Normalize code fences to use ``` (not ~~~)
  return markdown.replace(/^~~~(.*)$/gm, '```$1');
}
