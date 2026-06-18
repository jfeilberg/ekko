import agentDef from '@/agent/agent';
import { instructions } from './instructions.generated';
import { env } from '../env';

// Framework last-resort backstop. agent/agent.ts (forker-owned) sets the real
// defaults above this layer, and env vars override those — all three must agree
// on the free-tier-safe default.
const FALLBACK_MODEL = 'anthropic/claude-haiku-4.5';
const FALLBACK_MAX_STEPS = 16;

export function resolveModel(envModel: string | undefined, agentModel: string | undefined): string {
  return envModel ?? agentModel ?? FALLBACK_MODEL;
}
export function resolveMaxSteps(envSteps: number | undefined, agentSteps: number | undefined): number {
  return envSteps ?? agentSteps ?? FALLBACK_MAX_STEPS;
}

export function resolveAgentConfig() {
  const e = env();
  return {
    model: resolveModel(e.LLM_MODEL, agentDef.model),
    maxSteps: resolveMaxSteps(e.MAX_AGENT_STEPS, agentDef.maxSteps),
    instructions,
  };
}
