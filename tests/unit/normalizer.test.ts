import { describe, it, expect } from 'vitest';
import {
  normalizeMarkdown,
  normalizeHeadings,
  normalizeCodeFences,
  convertFiguresToMarkdown,
} from '../../src/core/normalizer.js';

describe('normalizeMarkdown', () => {
  describe('trailing whitespace', () => {
    it('strips trailing spaces from lines', () => {
      expect(normalizeMarkdown('hello   \nworld  ')).toBe('hello\nworld\n');
    });

    it('strips trailing tabs from lines', () => {
      expect(normalizeMarkdown('hello\t\t\nworld\t')).toBe('hello\nworld\n');
    });
  });

  describe('smart quotes', () => {
    it('converts smart double quotes to straight', () => {
      const result = normalizeMarkdown('\u201CHello\u201D');
      expect(result.charCodeAt(0)).toBe(0x22);
      expect(result).toContain('Hello');
      expect(result.charCodeAt(result.indexOf('Hello') + 5)).toBe(0x22);
    });

    it('converts smart single quotes to straight', () => {
      const result = normalizeMarkdown('\u2018Hello\u2019');
      expect(result.charCodeAt(0)).toBe(0x27);
      expect(result).toContain('Hello');
    });
  });

  describe('dashes', () => {
    it('converts em-dashes to hyphens', () => {
      expect(normalizeMarkdown('word\u2014word')).toBe('word-word\n');
    });

    it('converts en-dashes to hyphens', () => {
      expect(normalizeMarkdown('word\u2013word')).toBe('word-word\n');
    });
  });

  describe('line endings', () => {
    it('normalizes CRLF to LF', () => {
      expect(normalizeMarkdown('a\r\nb')).toBe('a\nb\n');
    });

    it('normalizes CR to LF', () => {
      expect(normalizeMarkdown('a\rb')).toBe('a\nb\n');
    });

    it('ensures single trailing newline', () => {
      expect(normalizeMarkdown('hello')).toBe('hello\n');
      expect(normalizeMarkdown('hello\n\n\n')).toBe('hello\n');
    });
  });

  describe('blank lines', () => {
    it('collapses 3+ blank lines to 2', () => {
      expect(normalizeMarkdown('a\n\n\n\nb')).toBe('a\n\nb\n');
    });

    it('preserves double blank lines', () => {
      expect(normalizeMarkdown('a\n\nb')).toBe('a\n\nb\n');
    });
  });

  describe('list markers', () => {
    it('converts * bullets to -', () => {
      expect(normalizeMarkdown('* item')).toBe('- item\n');
    });

    it('converts + bullets to -', () => {
      expect(normalizeMarkdown('+ item')).toBe('- item\n');
    });

    it('preserves indentation on nested lists', () => {
      expect(normalizeMarkdown('  * nested')).toBe('  - nested\n');
    });

    it('leaves - bullets unchanged', () => {
      expect(normalizeMarkdown('- item')).toBe('- item\n');
    });
  });

  describe('emphasis markers', () => {
    it('converts __bold__ to **bold**', () => {
      expect(normalizeMarkdown('__bold__')).toBe('**bold**\n');
    });

    it('converts _italic_ to *italic* when surrounded by whitespace', () => {
      expect(normalizeMarkdown('some _italic_ text')).toBe('some *italic* text\n');
    });

    it('preserves existing **bold**', () => {
      expect(normalizeMarkdown('**bold**')).toBe('**bold**\n');
    });

    it('preserves existing *italic*', () => {
      expect(normalizeMarkdown('*italic*')).toBe('*italic*\n');
    });
  });

  describe('horizontal rules', () => {
    it('normalizes *** to ---', () => {
      const result = normalizeMarkdown('text\n\n***\n\nmore');
      expect(result).toContain('\n---\n');
    });

    it('normalizes ___ to ---', () => {
      const result = normalizeMarkdown('text\n\n___\n\nmore');
      expect(result).toContain('\n---\n');
    });

    it('normalizes long dashes to ---', () => {
      const result = normalizeMarkdown('text\n\n----------\n\nmore');
      expect(result).toContain('\n---\n');
    });

    it('normalizes ***** to ---', () => {
      const result = normalizeMarkdown('text\n\n*****\n\nmore');
      expect(result).toContain('\n---\n');
    });
  });

  describe('indented code blocks', () => {
    it('converts 4-space indented code to fenced blocks', () => {
      const input = 'text\n\n    const x = 1;\n    const y = 2;\n\nmore text';
      const result = normalizeMarkdown(input);
      expect(result).toContain('```\nconst x = 1;\nconst y = 2;\n```');
    });

    it('does not convert indented content inside fenced blocks', () => {
      const input = '```mermaid\n    graph TD\n    A --> B\n```';
      const result = normalizeMarkdown(input);
      expect(result).toContain('```mermaid\n    graph TD\n    A --> B\n```');
    });

    it('handles file ending with indented code block', () => {
      const input = 'text\n\n    code line';
      const result = normalizeMarkdown(input);
      expect(result).toContain('```\ncode line\n```');
    });
  });

  describe('HTML img tags', () => {
    it('converts img tags to markdown image syntax', () => {
      expect(normalizeMarkdown('<img src="photo.png" />')).toBe('![](photo.png)\n');
    });

    it('converts img tags with attributes', () => {
      expect(normalizeMarkdown('<img src="photo.png" alt="a photo" width="100" />')).toBe(
        '![](photo.png)\n',
      );
    });
  });

  describe('combined normalization', () => {
    it('applies all normalizations together', () => {
      const input = '\u201CHello\u201D   \r\n* item\n\n\n\nsome __bold__ text';
      const result = normalizeMarkdown(input);
      // Smart quotes converted to straight (char code 0x22)
      expect(result.charCodeAt(0)).toBe(0x22);
      expect(result).toContain('- item');
      expect(result).toContain('**bold**');
      // Should collapse 4 newlines to 2
      expect(result).not.toContain('\n\n\n');
    });
  });
});

describe('normalizeHeadings', () => {
  it('adds space after # when missing', () => {
    expect(normalizeHeadings('#Hello')).toBe('# Hello');
  });

  it('adds space for deeper heading levels', () => {
    expect(normalizeHeadings('###Hello')).toBe('### Hello');
  });

  it('leaves properly spaced headings alone', () => {
    expect(normalizeHeadings('# Hello')).toBe('# Hello');
  });
});

describe('normalizeCodeFences', () => {
  it('converts ~~~ to ```', () => {
    expect(normalizeCodeFences('~~~\ncode\n~~~')).toBe('```\ncode\n```');
  });

  it('preserves language after fence', () => {
    expect(normalizeCodeFences('~~~python\ncode\n~~~')).toBe('```python\ncode\n```');
  });

  it('leaves ``` unchanged', () => {
    expect(normalizeCodeFences('```js\ncode\n```')).toBe('```js\ncode\n```');
  });
});

describe('convertFiguresToMarkdown', () => {
  it('converts figure with img and figcaption to markdown image', () => {
    const input = [
      '<figure>',
      '<img src="media/image.png" alt="alt text" />',
      '<figcaption aria-hidden="true"><p>caption text</p></figcaption>',
      '</figure>',
    ].join('\n');
    expect(convertFiguresToMarkdown(input)).toBe('![alt text](media/image.png)');
  });

  it('uses caption as fallback when img has no alt text', () => {
    const input = [
      '<figure>',
      '<img src="media/image.png" alt="" />',
      '<figcaption aria-hidden="true"><p>caption text</p></figcaption>',
      '</figure>',
    ].join('\n');
    expect(convertFiguresToMarkdown(input)).toBe('![caption text](media/image.png)');
  });

  it('handles figure with only img (no caption)', () => {
    const input = ['<figure>', '<img src="media/image.png" alt="" />', '</figure>'].join('\n');
    expect(convertFiguresToMarkdown(input)).toBe('![](media/image.png)');
  });

  it('leaves non-figure content unchanged', () => {
    const input = 'Some regular text\n\nMore text';
    expect(convertFiguresToMarkdown(input)).toBe(input);
  });

  it('handles unclosed figure tag gracefully', () => {
    const input = '<figure>\n<img src="img.png" alt="" />\nno closing tag';
    const result = convertFiguresToMarkdown(input);
    expect(result).toContain('<figure>');
  });
});
