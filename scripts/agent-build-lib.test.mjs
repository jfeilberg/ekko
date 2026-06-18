import { describe, it, expect } from 'vitest';
import { deriveName, validateNames } from './agent-build-lib.mjs';

describe('deriveName', () => {
  it('strips the .ts extension', () => expect(deriveName('sku_lookup.ts')).toBe('sku_lookup'));
});

describe('validateNames', () => {
  it('rejects non-snake_case', () => {
    expect(() => validateNames(['Bad-Name'], 'tool', new Set())).toThrow(/snake_case/);
  });
  it('rejects duplicates', () => {
    expect(() => validateNames(['a', 'a'], 'tool', new Set())).toThrow(/duplicate/i);
  });
  it('rejects collisions with reserved names', () => {
    expect(() => validateNames(['export_pdf'], 'tool', new Set(['export_pdf']))).toThrow(/reserved|built-in/i);
  });
  it('accepts a clean set', () => {
    expect(() => validateNames(['a', 'b_c'], 'tool', new Set(['x']))).not.toThrow();
  });
});
