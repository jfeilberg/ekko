import { describe, it, expect } from 'vitest';
import { filterEnabled, selectAutoActive } from './loader';
import type { Skill } from './types';

function skill(partial: Partial<Skill> & Pick<Skill, 'name' | 'trigger'>): Skill {
  return {
    description: `${partial.name} description`,
    body: `${partial.name} body`,
    keywords: [],
    requiredTools: [],
    hasResources: false,
    ...partial,
  };
}

const SKILLS: Skill[] = [
  skill({ name: 'always-one', trigger: 'always' }),
  skill({ name: 'kw-one', trigger: 'keyword', keywords: ['triage', 'inbox'] }),
  skill({ name: 'model-one', trigger: 'model' }),
];

describe('filterEnabled', () => {
  it('returns everything when the filter is empty', () => {
    expect(filterEnabled(SKILLS, [])).toHaveLength(3);
  });

  it('keeps only the named skills', () => {
    const out = filterEnabled(SKILLS, ['kw-one']);
    expect(out.map((s) => s.name)).toEqual(['kw-one']);
  });
});

describe('selectAutoActive', () => {
  it('always includes always-triggered skills', () => {
    const out = selectAutoActive(SKILLS, 'hello there', 3);
    expect(out.map((s) => s.name)).toContain('always-one');
  });

  it('includes keyword skills only when a keyword matches (case-insensitive)', () => {
    const matched = selectAutoActive(SKILLS, 'please TRIAGE my mail', 3);
    expect(matched.map((s) => s.name)).toContain('kw-one');
    const unmatched = selectAutoActive(SKILLS, 'what is on my calendar', 3);
    expect(unmatched.map((s) => s.name)).not.toContain('kw-one');
  });

  it('never includes model-triggered skills', () => {
    const out = selectAutoActive(SKILLS, 'triage inbox', 3);
    expect(out.map((s) => s.name)).not.toContain('model-one');
  });

  it('respects the cap', () => {
    expect(selectAutoActive(SKILLS, 'triage', 1)).toHaveLength(1);
    expect(selectAutoActive(SKILLS, 'triage', 0)).toHaveLength(0);
  });
});
