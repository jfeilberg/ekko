// Reads the fork-owned sandbox config from agent/sandbox.ts.
import sandbox from '@/agent/sandbox';
import type { SandboxConfig } from '@/lib/framework';

export function getSandboxSetup(): SandboxConfig['setup'] {
  return sandbox.setup;
}
