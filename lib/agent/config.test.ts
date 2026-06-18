import { describe, it, expect } from 'vitest';
import { resolveModel, resolveMaxSteps } from './config';

describe('config precedence (env > agent.ts > fallback)', () => {
  it('env wins when set', () => {
    expect(resolveModel('env/model', 'agent/model')).toBe('env/model');
    expect(resolveMaxSteps(7, 16)).toBe(7);
  });
  it('agent default applies when env unset', () => {
    expect(resolveModel(undefined, 'agent/model')).toBe('agent/model');
    expect(resolveMaxSteps(undefined, 16)).toBe(16);
  });
  it('framework fallback applies when both unset', () => {
    expect(resolveModel(undefined, undefined)).toBe('anthropic/claude-haiku-4.5');
    expect(resolveMaxSteps(undefined, undefined)).toBe(16);
  });
});
