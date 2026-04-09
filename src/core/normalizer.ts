/**
 * Normalize markdown output to improve round-trip fidelity
 */
export function normalizeMarkdown(markdown: string): string {
  let normalized = markdown;

  // 1. Strip trailing whitespace from each line
  normalized = normalized.replace(/[ \t]+$/gm, '');

  // 2. Convert smart quotes to straight quotes
  normalized = normalized.replace(/[\u201C\u201D]/g, '"');
  normalized = normalized.replace(/[\u2018\u2019]/g, "'");

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

  // 9. Normalize horizontal rules to simple ---
  normalized = normalizeHorizontalRules(normalized);

  // 10. Convert indented code blocks to fenced code blocks
  normalized = convertIndentedCodeToFenced(normalized);

  // 11. Convert HTML img tags to markdown image syntax
  normalized = convertHtmlImagesToMarkdown(normalized);

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

/**
 * Normalize horizontal rules to simple --- style
 */
function normalizeHorizontalRules(markdown: string): string {
  // Replace any line with 3+ dashes/asterisks/underscores (optionally with spaces) with ---
  return markdown.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '---');
}

/**
 * Convert indented code blocks (4 spaces) to fenced code blocks
 * Skips content already inside fence blocks (like mermaid diagrams)
 */
function convertIndentedCodeToFenced(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let inFencedBlock = false; // Track if we're inside a ``` fence
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isIndentedCode = /^    /.test(line);
    const isEmpty = /^\s*$/.test(line);
    const isFenceMarker = /^```/.test(line);

    // Track fenced blocks (mermaid, code, etc.)
    if (isFenceMarker) {
      inFencedBlock = !inFencedBlock;
      result.push(line);
      continue;
    }

    // Skip processing if we're inside a fenced block
    if (inFencedBlock) {
      result.push(line);
      continue;
    }

    if (isIndentedCode) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      }
      // Remove the 4-space indent
      codeLines.push(line.substring(4));
    } else if (inCodeBlock && isEmpty && i + 1 < lines.length && /^    /.test(lines[i + 1])) {
      // Empty line within code block - keep it
      codeLines.push('');
    } else {
      // End of code block
      if (inCodeBlock) {
        result.push('```');
        result.push(...codeLines);
        result.push('```');
        inCodeBlock = false;
        codeLines = [];
      }
      result.push(line);
    }
  }

  // Handle case where file ends with code block
  if (inCodeBlock) {
    result.push('```');
    result.push(...codeLines);
    result.push('```');
  }

  return result.join('\n');
}

/**
 * Convert HTML figure/figcaption blocks to markdown images
 * Example:
 * <figure>
 * ![](media/image.png)
 * <figcaption aria-hidden="true"><p>alt text</p></figcaption>
 * </figure>
 * Becomes: ![alt text](media/image.png)
 */
export function convertFiguresToMarkdown(markdown: string): string {
  // Process line by line to handle figure blocks
  const lines = markdown.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check if this is the start of a figure block
    if (line.trim() === '<figure>') {
      // Look for the image and caption in the next few lines
      let imagePath: string | null = null;
      let altText: string | null = null;
      let j = i + 1;

      // Scan ahead for image and caption (max 10 lines)
      while (j < lines.length && j < i + 10) {
        const nextLine = lines[j];

        // Match image: <img src="path" ... alt="alt text" />
        const imgMatch = nextLine.match(/<img\s+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/);
        if (imgMatch) {
          imagePath = imgMatch[1];
          altText = imgMatch[2] || null; // Alt text from img tag
        }

        // Match caption: <figcaption...><p>text</p></figcaption>
        // Use caption as fallback if no alt text on img tag
        const captionMatch = nextLine.match(/<figcaption[^>]*><p>([^<]+)<\/p><\/figcaption>/);
        if (captionMatch && !altText) {
          altText = captionMatch[1];
        }

        // End of figure block
        if (nextLine.trim() === '</figure>') {
          // Replace the entire figure block with markdown image
          if (imagePath && altText) {
            result.push(`![${altText}](${imagePath})`);
          } else if (imagePath) {
            result.push(`![](${imagePath})`);
          }
          // Skip to after the </figure> tag
          i = j + 1;
          break;
        }

        j++;
      }

      // If we didn't find a closing tag, just keep the original line
      if (j >= lines.length || j >= i + 10) {
        result.push(line);
        i++;
      }
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

/**
 * Convert HTML img tags to markdown image syntax
 */
function convertHtmlImagesToMarkdown(markdown: string): string {
  // Match <img src="path" ... /> and convert to ![](path)
  return markdown.replace(/<img\s+src="([^"]+)"[^>]*>/gi, '![]($1)');
}
