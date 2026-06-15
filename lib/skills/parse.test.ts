import { describe, it, expect } from 'vitest';
import { parseSkill } from './parse';

const VALID = `---
name: email-triage
description: Triages an inbox. Use when the user asks to triage email.
trigger: keyword
keywords:
  - Triage
  - INBOX
required_tools:
  - gmail
---

# Email triage

Do the thing.
`;

describe('parseSkill', () => {
  it('parses valid frontmatter and body', () => {
    const skill = parseSkill(VALID);
    expect(skill.name).toBe('email-triage');
    expect(skill.description).toMatch(/Triages an inbox/);
    expect(skill.trigger).toBe('keyword');
    expect(skill.body).toContain('# Email triage');
    expect(skill.requiredTools).toEqual(['gmail']);
  });

  it('lowercases keywords', () => {
    expect(parseSkill(VALID).keywords).toEqual(['triage', 'inbox']);
  });

  it('defaults trigger to model and arrays to empty', () => {
    const skill = parseSkill(`---
name: minimal
description: A minimal skill that does something. Use when relevant.
---
Body here.`);
    expect(skill.trigger).toBe('model');
    expect(skill.keywords).toEqual([]);
    expect(skill.requiredTools).toEqual([]);
  });

  it('throws when frontmatter is missing', () => {
    expect(() => parseSkill('# no frontmatter')).toThrow(/frontmatter/);
  });

  it('throws on an invalid name', () => {
    expect(() =>
      parseSkill(`---
name: Bad Name
description: nope
---
body`),
    ).toThrow(/Invalid SKILL.md frontmatter/);
  });

  it('throws on an empty body', () => {
    expect(() =>
      parseSkill(`---
name: empty
description: has no body but is otherwise fine here
---
`),
    ).toThrow(/empty body/);
  });
});
