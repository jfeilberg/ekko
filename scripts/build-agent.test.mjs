import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

let dir;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'ekko-agent-'));
  mkdirSync(join(dir, 'agent/tools'), { recursive: true });
  mkdirSync(join(dir, 'agent/connections'), { recursive: true });
  mkdirSync(join(dir, 'agent/skills/demo'), { recursive: true });
  writeFileSync(join(dir, 'agent/tools/echo.ts'), 'export default {} as never;\n');
  writeFileSync(join(dir, 'agent/tools/_template.ts'), 'export default {} as never;\n');
  writeFileSync(join(dir, 'agent/connections/acme.ts'), 'export default {} as never;\n');
  // instructions.md with both a comment (must be stripped) and real text
  writeFileSync(join(dir, 'agent/instructions.md'), '<!--c-->\nBe terse.\n');
  writeFileSync(
    join(dir, 'agent/skills/demo/SKILL.md'),
    '---\nname: demo\ndescription: d\n---\nbody\n',
  );
  mkdirSync(join(dir, 'lib/tools'), { recursive: true });
  mkdirSync(join(dir, 'lib/agent'), { recursive: true });
  mkdirSync(join(dir, 'lib/skills'), { recursive: true });
  execFileSync('node', [join(process.cwd(), 'scripts/build-agent.mjs')], {
    env: { ...process.env, AGENT_BUILD_ROOT: dir },
  });
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

it('discovers tools, skipping underscore-prefixed files', () => {
  const out = readFileSync(join(dir, 'lib/tools/custom.generated.ts'), 'utf8');
  expect(out).toContain('echo:');
  expect(out).not.toContain('_template');
});
it('discovers connections', () => {
  expect(readFileSync(join(dir, 'lib/tools/connections.generated.ts'), 'utf8')).toContain('acme:');
});
it('inlines instructions.md (strips HTML comments, keeps real text)', () => {
  const out = readFileSync(join(dir, 'lib/agent/instructions.generated.ts'), 'utf8');
  expect(out).toContain('Be terse.');
  expect(out).not.toContain('<!--');
});
it('compiles skills from agent/skills', () => {
  expect(readFileSync(join(dir, 'lib/skills/catalog.generated.ts'), 'utf8')).toContain('"name": "demo"');
});
it('comment-only instructions.md yields undefined', () => {
  const commentDir = mkdtempSync(join(tmpdir(), 'ekko-agent-comment-'));
  try {
    mkdirSync(join(commentDir, 'agent/tools'), { recursive: true });
    mkdirSync(join(commentDir, 'agent/connections'), { recursive: true });
    mkdirSync(join(commentDir, 'agent/skills'), { recursive: true });
    mkdirSync(join(commentDir, 'lib/tools'), { recursive: true });
    mkdirSync(join(commentDir, 'lib/agent'), { recursive: true });
    mkdirSync(join(commentDir, 'lib/skills'), { recursive: true });
    // comment-only instructions file — should resolve to undefined
    writeFileSync(join(commentDir, 'agent/instructions.md'), '<!-- just a comment -->\n');
    execFileSync('node', [join(process.cwd(), 'scripts/build-agent.mjs')], {
      env: { ...process.env, AGENT_BUILD_ROOT: commentDir },
    });
    const out = readFileSync(join(commentDir, 'lib/agent/instructions.generated.ts'), 'utf8');
    expect(out).toContain('= undefined');
    expect(out).not.toContain('<!--');
  } finally {
    rmSync(commentDir, { recursive: true, force: true });
  }
});
