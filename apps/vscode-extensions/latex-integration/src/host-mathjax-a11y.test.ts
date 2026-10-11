/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { hostSupportsMathJaxSreImportScripts } from './host-mathjax-a11y.ts';

describe('hostSupportsMathJaxSreImportScripts', () => {
  test('enables SRE on Cursor', () => {
    expect(hostSupportsMathJaxSreImportScripts('Cursor')).toBe(true);
    expect(hostSupportsMathJaxSreImportScripts('cursor')).toBe(true);
  });

  test('disables SRE on Visual Studio Code and unknown hosts (fail closed)', () => {
    expect(hostSupportsMathJaxSreImportScripts('Visual Studio Code')).toBe(
      false,
    );
    expect(
      hostSupportsMathJaxSreImportScripts('Visual Studio Code - Insiders'),
    ).toBe(false);
    expect(hostSupportsMathJaxSreImportScripts('Code - OSS')).toBe(false);
    expect(hostSupportsMathJaxSreImportScripts('Windsurf')).toBe(false);
    expect(hostSupportsMathJaxSreImportScripts('')).toBe(false);
  });
});
