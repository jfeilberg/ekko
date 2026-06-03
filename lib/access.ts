import { env } from './env';

export interface AccessSubject {
  userId?: string;
  channelId?: string;
}

export interface AccessPolicy {
  mode: 'open' | 'allowlist';
  allowedUsers: string[];
  allowedChannels: string[];
}

export const ACCESS_DENIED_MESSAGE =
  "Sorry — you don't have access to Ekko in this context. Ask the deployer to add you " +
  "to EKKO_ALLOWED_USERS or post in a channel listed in EKKO_ALLOWED_CHANNELS.";

export function checkAccess(subject: AccessSubject, policy: AccessPolicy): boolean {
  if (policy.mode === 'open') return true;
  const userOk = Boolean(subject.userId && policy.allowedUsers.includes(subject.userId));
  const channelOk = Boolean(subject.channelId && policy.allowedChannels.includes(subject.channelId));
  return userOk || channelOk;
}

export function isAllowed(subject: AccessSubject): boolean {
  const e = env();
  return checkAccess(subject, {
    mode: e.EKKO_ACCESS_MODE,
    allowedUsers: e.EKKO_ALLOWED_USERS,
    allowedChannels: e.EKKO_ALLOWED_CHANNELS,
  });
}
