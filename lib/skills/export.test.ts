import { describe, it, expect } from 'vitest';
import { resolvePdfExport } from './export';

describe('resolvePdfExport', () => {
  it('off disables regardless of credentials', () => {
    expect(resolvePdfExport('off', true)).toBe(false);
    expect(resolvePdfExport('off', false)).toBe(false);
  });

  it('on enables regardless of credentials', () => {
    expect(resolvePdfExport('on', false)).toBe(true);
  });

  it('auto follows credential presence', () => {
    expect(resolvePdfExport('auto', true)).toBe(true);
    expect(resolvePdfExport('auto', false)).toBe(false);
  });
});
