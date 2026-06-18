import type { Tool } from 'ai';
export { withStatusLabel } from '../tools/registry';

/** Named tone presets (the persona renderer maps these to prose). */
export type TonePreset = 'concise' | 'warm' | 'executive' | 'playful';

export type Persona = {
  name: string;
  role: string;
  tone: TonePreset;
  customTone?: string;
  traits: string[];
  focus: string[];
};

export type AgentConfig = {
  /** Structured persona (from agent/persona.ts). */
  persona: Persona;
  /** Default model id (Vercel AI Gateway form). env LLM_MODEL overrides. */
  model?: string;
  /** Default tool-loop step cap. env MAX_AGENT_STEPS overrides. */
  maxSteps?: number;
};

/** A remote capability the agent connects to (you don't author the server). */
export type Connection = { type: 'mcp'; url: string; authorization?: () => string };

export type SandboxConfig = {
  runtime: 'node22';
  /** Cold-start setup commands, run in order: [command, args]. */
  setup: ReadonlyArray<readonly [string, string[]]>;
};

export function defineAgent(config: AgentConfig): AgentConfig { return config; }
export function defineConnection(config: Connection): Connection { return config; }
export function defineSandbox(config: SandboxConfig): SandboxConfig { return config; }

/** Re-exported for convenience in agent/ code. */
export type { Tool };
