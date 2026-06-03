import { describe, expect, it } from 'vitest';
import { checkAccess } from './access';

describe('checkAccess', () => {
  it('allows everyone in open mode', () => {
    expect(checkAccess({ userId: 'U1' }, { mode: 'open', allowedUsers: [], allowedChannels: [] })).toBe(true);
  });

  it('denies in allowlist mode with empty lists', () => {
    expect(checkAccess({ userId: 'U1', channelId: 'C1' }, { mode: 'allowlist', allowedUsers: [], allowedChannels: [] })).toBe(false);
  });

  it('allows when user is in allowlist', () => {
    expect(checkAccess({ userId: 'U1' }, { mode: 'allowlist', allowedUsers: ['U1'], allowedChannels: [] })).toBe(true);
  });

  it('allows when channel is in allowlist', () => {
    expect(checkAccess({ channelId: 'C1' }, { mode: 'allowlist', allowedUsers: [], allowedChannels: ['C1'] })).toBe(true);
  });

  it('user-allowed OR channel-allowed counts as allowed', () => {
    expect(checkAccess({ userId: 'U1', channelId: 'C2' }, { mode: 'allowlist', allowedUsers: ['U1'], allowedChannels: ['C99'] })).toBe(true);
  });
});
