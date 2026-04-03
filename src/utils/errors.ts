export class MdWordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MdWordError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PandocError extends MdWordError {
  constructor(message: string, public stderr?: string) {
    super(message);
    this.name = 'PandocError';
  }
}

export class MermaidRenderError extends MdWordError {
  constructor(
    message: string,
    public diagramId: string,
    public stderr?: string
  ) {
    super(message);
    this.name = 'MermaidRenderError';
  }
}

export class TemplateNotFoundError extends MdWordError {
  constructor(searchPaths: string[]) {
    super(`Template not found. Searched in:\n${searchPaths.map(p => `  - ${p}`).join('\n')}`);
    this.name = 'TemplateNotFoundError';
  }
}

export class ValidationError extends MdWordError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DependencyError extends MdWordError {
  constructor(
    dependency: 'pandoc' | 'mmdc',
    installInstructions: string
  ) {
    super(
      `${dependency} is not installed or not in PATH.\n\n` +
      `Installation instructions:\n${installInstructions}`
    );
    this.name = 'DependencyError';
  }
}
