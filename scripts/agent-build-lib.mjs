/** Pure helpers for the agent codegen (testable without fs). */
export function deriveName(filename) {
  return filename.replace(/\.[^.]+$/, '');
}

/** True for source files the codegen should ignore (templates, hidden, tests). */
export function isIgnored(filename) {
  return filename.startsWith('_') || filename.startsWith('.') || /\.test\.[mc]?[jt]s$/.test(filename);
}

export function validateNames(names, kind, reserved) {
  const seen = new Set();
  for (const name of names) {
    if (!/^[a-z0-9_]+$/.test(name)) {
      throw new Error(`Invalid ${kind} name "${name}": must be snake_case ([a-z0-9_]+).`);
    }
    if (seen.has(name)) throw new Error(`Duplicate ${kind} "${name}".`);
    if (reserved.has(name)) throw new Error(`${kind} "${name}" collides with a reserved/built-in name.`);
    seen.add(name);
  }
}

/** Built-in tool names a custom tool must not shadow (builtin wins in mergeTools). */
export const RESERVED_TOOL_NAMES = new Set([
  'load_skill', 'read_skill_file', 'export_pdf', 'render_artifact',
]);
