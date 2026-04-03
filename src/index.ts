// Public API exports
export { md2word, type Md2WordOptions } from './commands/md2word.js';
export { word2md, type Word2MdOptions } from './commands/word2md.js';
export { normalizeMarkdown } from './core/normalizer.js';
export {
  MdWordError,
  PandocError,
  MermaidRenderError,
  TemplateNotFoundError,
  ValidationError,
  DependencyError,
} from './utils/errors.js';
