import { getSkillResources } from './resources';
import { getAvailableSkills } from './loader';
import { bundleHtml, type BundleResult } from './bundle';

/**
 * Bundle an authored HTML artifact into one self-contained file, resolving asset
 * references against every resource-bearing skill (today: design-system). Shared
 * by the `render_artifact` (HTML) and `export_pdf` (sandbox) delivery tools.
 */
export async function bundleArtifact(html: string): Promise<BundleResult> {
  const all = await getSkillResources();
  const withResources = getAvailableSkills().filter((s) => s.hasResources).map((s) => s.name);
  const merged = Object.assign({}, ...withResources.map((n) => all[n] ?? {}));
  return bundleHtml(html, merged);
}
