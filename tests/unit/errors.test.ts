import { describe, it, expect } from 'vitest';
import {
  MdWordError,
  PandocError,
  MermaidRenderError,
  TemplateNotFoundError,
  ValidationError,
  DependencyError,
} from '../../src/utils/errors.js';

describe('error classes', () => {
  describe('MdWordError', () => {
    it('is an instance of Error', () => {
      const err = new MdWordError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(MdWordError);
    });

    it('has correct name and message', () => {
      const err = new MdWordError('something broke');
      expect(err.name).toBe('MdWordError');
      expect(err.message).toBe('something broke');
    });

    it('has a stack trace', () => {
      const err = new MdWordError('test');
      expect(err.stack).toBeDefined();
    });
  });

  describe('PandocError', () => {
    it('extends MdWordError', () => {
      const err = new PandocError('pandoc failed');
      expect(err).toBeInstanceOf(MdWordError);
      expect(err.name).toBe('PandocError');
    });

    it('stores stderr', () => {
      const err = new PandocError('pandoc failed', 'error output');
      expect(err.stderr).toBe('error output');
    });

    it('stderr is optional', () => {
      const err = new PandocError('pandoc failed');
      expect(err.stderr).toBeUndefined();
    });
  });

  describe('MermaidRenderError', () => {
    it('extends MdWordError', () => {
      const err = new MermaidRenderError('render failed', 'diagram-1');
      expect(err).toBeInstanceOf(MdWordError);
      expect(err.name).toBe('MermaidRenderError');
    });

    it('stores diagramId and stderr', () => {
      const err = new MermaidRenderError('render failed', 'diagram-1', 'error output');
      expect(err.diagramId).toBe('diagram-1');
      expect(err.stderr).toBe('error output');
    });
  });

  describe('TemplateNotFoundError', () => {
    it('extends MdWordError', () => {
      const err = new TemplateNotFoundError(['/path/a', '/path/b']);
      expect(err).toBeInstanceOf(MdWordError);
      expect(err.name).toBe('TemplateNotFoundError');
    });

    it('includes searched paths in message', () => {
      const err = new TemplateNotFoundError(['/path/a', '/path/b']);
      expect(err.message).toContain('/path/a');
      expect(err.message).toContain('/path/b');
    });
  });

  describe('ValidationError', () => {
    it('extends MdWordError', () => {
      const err = new ValidationError('invalid input');
      expect(err).toBeInstanceOf(MdWordError);
      expect(err.name).toBe('ValidationError');
      expect(err.message).toBe('invalid input');
    });
  });

  describe('DependencyError', () => {
    it('extends MdWordError', () => {
      const err = new DependencyError('pandoc', 'brew install pandoc');
      expect(err).toBeInstanceOf(MdWordError);
      expect(err.name).toBe('DependencyError');
    });

    it('includes dependency name and install instructions in message', () => {
      const err = new DependencyError('pandoc', 'brew install pandoc');
      expect(err.message).toContain('pandoc');
      expect(err.message).toContain('not installed');
      expect(err.message).toContain('brew install pandoc');
    });

    it('works for mmdc dependency', () => {
      const err = new DependencyError('mmdc', 'npm install -g @mermaid-js/mermaid-cli');
      expect(err.message).toContain('mmdc');
      expect(err.message).toContain('npm install');
    });
  });
});
