# @prosemark/paste-rich-text

## 0.0.5

### Patch Changes

- 6b5b440: Add package README files with install instructions, usage examples, and links to prosemark.com documentation.

## 0.0.4

### Patch Changes

- 24ca7ca: Update `@codemirror/view` to `^6.42.1`.
- 4c06b33: Published packages no longer include `devDependencies` in their npm registry manifest; CI strips `devDependencies` before `bun pm pack` so workspace-only dev tooling is not resolved at publish time.

## 0.0.3

### Patch Changes

- aa619dd: Avoid rich-text markdown conversion when pasting inside an existing fenced code block so pasted code remains plain text and does not create nested code fences.

## 0.0.2

### Patch Changes

- b99496e: Change CI process so that workspace dependencies are correcly resolved during publishing

## 0.0.1

### Patch Changes

- b3a35fb: Can paste rich text into editor
