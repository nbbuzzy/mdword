# Custom Reference Templates

This directory is reserved for a bundled default `reference.docx` template, but **templates are entirely optional**.

## Template Lookup

mdword looks for templates in this order:
1. Custom path via `--template` flag
2. `.mdword/reference.docx` in project directory (walks up directory tree)
3. This directory: `templates/default-reference.docx` (if provided)
4. **Pandoc's built-in default styles** (if no template found)

If no template is found, pandoc uses its built-in default styles, which work well for most use cases.

## Creating a Custom Template

To customize Word document styling:

1. Open Microsoft Word
2. Create a new blank document
3. Define the following styles:
   - **Normal**: Default paragraph style (e.g., Calibri 11pt, 1.15 line spacing)
   - **Heading 1**: Large bold heading (e.g., Calibri 16pt, bold, color: #2E74B5)
   - **Heading 2**: Medium bold heading (e.g., Calibri 14pt, bold, color: #2E74B5)
   - **Heading 3**: Smaller bold heading (e.g., Calibri 12pt, bold, color: #1F4D78)
   - **Code**: Monospace font for code blocks (e.g., Consolas 10pt, light gray background)
   - **Table Grid**: Table style with borders
4. Save as `.mdword/reference.docx` in your project root

## For Package Maintainers

To bundle a default template with this package, place `default-reference.docx` in this directory. You can generate one using:

```bash
pandoc --print-default-data-file reference.docx > templates/default-reference.docx
```
