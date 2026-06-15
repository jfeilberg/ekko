import { parse as parseYaml } from 'yaml';
import { SkillFrontmatterSchema, type Skill } from './types';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Parse a raw `SKILL.md` string into a validated {@link Skill}.
 * Throws on missing/invalid frontmatter so the build step fails loudly rather
 * than shipping a malformed skill.
 */
export function parseSkill(raw: string): Skill {
  const match = FRONTMATTER_RE.exec(raw.trimStart());
  if (!match) {
    throw new Error('SKILL.md must start with YAML frontmatter delimited by ---');
  }
  const [, frontmatterBlock, body] = match;

  let data: unknown;
  try {
    data = parseYaml(frontmatterBlock ?? '');
  } catch (err) {
    throw new Error(`SKILL.md frontmatter is not valid YAML: ${(err as Error).message}`);
  }

  const parsed = SkillFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid SKILL.md frontmatter: ${issues}`);
  }

  const trimmedBody = (body ?? '').trim();
  if (!trimmedBody) {
    throw new Error(`Skill "${parsed.data.name}" has an empty body`);
  }

  return {
    name: parsed.data.name,
    description: parsed.data.description,
    body: trimmedBody,
    trigger: parsed.data.trigger,
    keywords: parsed.data.keywords.map((k) => k.toLowerCase()),
    requiredTools: parsed.data.required_tools,
    // Resources are discovered by the build step, not from a single SKILL.md
    // string; parseSkill is used for the body/frontmatter only.
    hasResources: false,
  };
}
