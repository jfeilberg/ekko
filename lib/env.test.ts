import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const REQUIRED: Record<string, string> = {
  SLACK_BOT_TOKEN: 'xoxb-test',
  SLACK_SIGNING_SECRET: 'secret',
  DATABASE_URL: 'postgresql://test',
};

describe('loadEnv', () => {
  it('parses a valid env object', () => {
    const env = loadEnv(REQUIRED);
    expect(env.SLACK_BOT_TOKEN).toBe('xoxb-test');
    expect(env.LLM_MODEL).toBe('anthropic/claude-opus-4.8');
    expect(env.COMPOSIO_ENABLED_TOOLKITS).toEqual([]);
    expect(env.ALLOW_CROSS_CHANNEL_POST).toBe(false);
  });

  it('throws on missing required vars', () => {
    const { SLACK_BOT_TOKEN: _drop, ...rest } = REQUIRED;
    expect(() => loadEnv(rest)).toThrow(/SLACK_BOT_TOKEN/);
  });

  it('parses COMPOSIO_ENABLED_TOOLKITS as comma-separated list', () => {
    const env = loadEnv({ ...REQUIRED, COMPOSIO_ENABLED_TOOLKITS: 'gmail, github , linear' });
    expect(env.COMPOSIO_ENABLED_TOOLKITS).toEqual(['gmail', 'github', 'linear']);
  });

  it('parses ALLOW_CROSS_CHANNEL_POST as boolean', () => {
    expect(loadEnv({ ...REQUIRED, ALLOW_CROSS_CHANNEL_POST: 'true' }).ALLOW_CROSS_CHANNEL_POST).toBe(true);
    expect(loadEnv({ ...REQUIRED, ALLOW_CROSS_CHANNEL_POST: 'false' }).ALLOW_CROSS_CHANNEL_POST).toBe(false);
  });

  it('defaults MAX_AGENT_STEPS to 16', () => {
    const env = loadEnv(REQUIRED);
    expect(env.MAX_AGENT_STEPS).toBe(16);
  });
});
