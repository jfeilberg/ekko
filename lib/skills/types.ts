import { z } from 'zod';

/**
 * How a skill's instructions (its L2 body) get pulled into a turn.
 *
 * - `model`  — the default. The skill's name + description are always visible to
 *              the model (L1 metadata); the model loads the full body on demand
 *              by calling the `load_skill` tool. This is the standard
 *              progressive-disclosure pattern (same as Claude Code / opencode).
 * - `always` — the body is injected into the system prompt on every turn. Use
 *              sparingly: every `always` skill is a fixed token cost.
 * - `keyword`— the body is auto-injected when one of `keywords` appears in the
 *              user's message. A cheap, deterministic pre-load.
 */
export type SkillTrigger = 'model' | 'always' | 'keyword';

export interface Skill {
  /** Lowercase/numbers/hyphens, <=64 chars. Also the catalog directory name. */
  name: string;
  /** What it does AND when to use it. Always shown to the model (L1). <=1024 chars. */
  description: string;
  /** The SKILL.md body — the L2 instructions. */
  body: string;
  trigger: SkillTrigger;
  /** Lowercase keywords that auto-load this skill when `trigger: keyword`. */
  keywords: string[];
  /** Soft requirement: tool/toolkit slugs this skill works best with. */
  requiredTools: string[];
  /** True when the skill ships bundled L3 resources (css/js/fonts/references). */
  hasResources: boolean;
}

/**
 * Frontmatter schema for a `SKILL.md` file. `name` + `description` are the only
 * required fields — matching the open Agent Skills standard (agentskills.io) so
 * skills authored here stay portable to Claude Code, Goose, opencode, etc.
 */
export const SkillFrontmatterSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'name must be lowercase letters, numbers, and hyphens only'),
  description: z.string().min(1).max(1024),
  trigger: z.enum(['model', 'always', 'keyword']).default('model'),
  keywords: z.array(z.string()).default([]),
  required_tools: z.array(z.string()).default([]),
});

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;
