import { describe, it, expect } from 'vitest';
import { getSandboxSetup } from './sandbox-config';

describe('getSandboxSetup', () => {
  it('returns the agent sandbox setup commands', () => {
    const setup = getSandboxSetup();
    expect(Array.isArray(setup)).toBe(true);
    expect(setup.length).toBeGreaterThan(0);
    expect(setup[0]?.[0]).toBe('npm');
    expect(setup.some(([cmd]) => cmd === 'sudo')).toBe(true);
  });
});
