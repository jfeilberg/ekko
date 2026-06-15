import { env } from '../env';
import type { Skill } from './types';
import { skills as catalog } from './catalog.generated';

// ── Pure helpers (no env / no I/O) — unit tested directly ──────────────────

/** Apply the opt-out filter. Empty `enabled` = everything is available. */
export function filterEnabled(skills: Skill[], enabled: string[]): Skill[] {
  if (!enabled.length) return skills;
  const allow = new Set(enabled);
  return skills.filter((s) => allow.has(s.name));
}

/**
 * Skills to inject without the model asking: `always` skills plus any `keyword`
 * skill matched against the user's message, capped at `max` (0 = none).
 */
export function selectAutoActive(skills: Skill[], userText: string, max: number): Skill[] {
  if (max <= 0) return [];
  const text = userText.toLowerCase();
  const active = skills.filter((s) => {
    if (s.trigger === 'always') return true;
    if (s.trigger === 'keyword') return s.keywords.some((k) => text.includes(k));
    return false;
  });
  return active.slice(0, max);
}

// ── Public API (env + catalog wired in) ───────────────────────────────────

/** Skills available this deployment after the `EKKO_ENABLED_SKILLS` filter. */
export function getAvailableSkills(): Skill[] {
  return filterEnabled(catalog, env().EKKO_ENABLED_SKILLS);
}

/** Auto-injected skills for this turn (always + keyword), capped by env. */
export function getAutoActiveSkills(userText: string): Skill[] {
  return selectAutoActive(getAvailableSkills(), userText, env().EKKO_MAX_ACTIVE_SKILLS);
}

/** Look up a single available skill by name (used by the `load_skill` tool). */
export function getSkillByName(name: string): Skill | undefined {
  return getAvailableSkills().find((s) => s.name === name);
}
