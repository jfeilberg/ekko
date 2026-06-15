/**
 * Runtime accessor for skill L3 resources (the files bundled alongside a
 * SKILL.md — css, js, markdown references, fonts, images).
 *
 * The actual data lives in the generated `resources.generated.ts`. We load it
 * via a dynamic import so the bundler code-splits it into its own chunk: the
 * (potentially large, font-embedding) module is only loaded the first time a
 * skill resource is actually read or rendered — never on a normal chat turn.
 */

export type SkillResource = { mime: string; text?: string; base64?: string };
/** skillName -> (skill-relative path -> resource). */
export type SkillResources = Record<string, Record<string, SkillResource>>;

let cache: SkillResources | undefined;

export async function getSkillResources(): Promise<SkillResources> {
  if (!cache) {
    try {
      const mod = await import('./resources.generated');
      cache = mod.resources;
    } catch {
      cache = {};
    }
  }
  return cache;
}

/** Resources for one skill, or an empty map if it ships none. */
export async function getResourcesFor(skill: string): Promise<Record<string, SkillResource>> {
  return (await getSkillResources())[skill] ?? {};
}
