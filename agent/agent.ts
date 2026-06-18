import { defineAgent } from 'ekko';
import { persona } from './persona';

export default defineAgent({
  persona,
  model: 'anthropic/claude-haiku-4.5', // default; env LLM_MODEL overrides
  maxSteps: 16,                        // default; env MAX_AGENT_STEPS overrides
});
