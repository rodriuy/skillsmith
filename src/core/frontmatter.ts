// A small YAML-frontmatter parser for SKILL.md. It only handles the subset of
// YAML that shows up in skill frontmatter, top-level scalars, single/double
// quotes, folded (>) and literal (|) block scalars, and nested maps like
// metadata. Pulling in a full YAML lib just for this isn't worth the extra
// dependency, and this covers every real skill I've thrown at it.

import type { Frontmatter } from "./types.js";

const KEY_RE = /^([A-Za-z0-9_.-]+):(.*)$/;

interface RawFrontmatter {
  values: Map<string, string>;
  /** Top-level keys in document order (including nested-mapping keys). */
  keys: string[];
  present: boolean;
  bodyStartLine: number;
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"') {
    return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (v.length >= 2 && v[0] === "'" && v[v.length - 1] === "'") {
    return v.slice(1, -1).replace(/''/g, "'");
  }
  return v;
}

function leadingSpaces(line: string): number {
  let n = 0;
  while (n < line.length && (line[n] === " " || line[n] === "\t")) n++;
  return n;
}

/** Parse the raw frontmatter block (returns present:false when absent/unclosed). */
export function parseRawFrontmatter(raw: string): RawFrontmatter {
  const empty: RawFrontmatter = {
    values: new Map(),
    keys: [],
    present: false,
    bodyStartLine: 1,
  };

  const text = stripBom(raw);
  const lines = text.split("\n").map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));

  if (lines.length === 0 || lines[0].trim() !== "---") return empty;

  // Find the closing delimiter.
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      close = i;
      break;
    }
  }
  if (close === -1) return empty;

  const values = new Map<string, string>();
  const keys: string[] = [];

  let i = 1;
  while (i < close) {
    const line = lines[i];
    if (line.trim() === "" || leadingSpaces(line) > 0) {
      // Blank line, or an indented continuation not consumed by a key, so skip.
      i++;
      continue;
    }
    const m = KEY_RE.exec(line);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1];
    const rest = m[2].trim();
    keys.push(key);

    if (rest === ">" || rest === ">-" || rest === ">+" || rest === "|" || rest === "|-" || rest === "|+") {
      // Block scalar, gather the following more-indented lines.
      const folded = rest[0] === ">";
      const collected: string[] = [];
      i++;
      while (i < close) {
        const bl = lines[i];
        if (bl.trim() !== "" && leadingSpaces(bl) === 0) break;
        collected.push(bl.trim());
        i++;
      }
      const joined = folded
        ? collected.join(" ").replace(/\s+/g, " ").trim()
        : collected.join("\n").trim();
      values.set(key, joined);
      continue;
    }

    if (rest === "") {
      // Either a nested mapping or an empty value. Skip indented children.
      i++;
      while (i < close && (lines[i].trim() === "" || leadingSpaces(lines[i]) > 0)) i++;
      // Record as present but with no scalar value.
      continue;
    }

    values.set(key, unquote(rest));
    i++;
  }

  return { values, keys, present: true, bodyStartLine: close + 2 };
}

/** Parse SKILL.md into the typed frontmatter we use elsewhere. */
export function parseFrontmatter(raw: string): Frontmatter {
  const parsed = parseRawFrontmatter(raw);
  const known = new Set(["name", "description"]);
  return {
    name: parsed.values.get("name"),
    description: parsed.values.get("description"),
    extraKeys: parsed.keys.filter((k) => !known.has(k)),
    present: parsed.present,
    bodyStartLine: parsed.bodyStartLine,
  };
}

/** Split raw SKILL.md into (frontmatter descriptor, body text). */
export function splitSkill(raw: string): { frontmatter: Frontmatter; body: string } {
  const frontmatter = parseFrontmatter(raw);
  if (!frontmatter.present) return { frontmatter, body: raw };
  const lines = stripBom(raw).split("\n");
  const body = lines.slice(frontmatter.bodyStartLine - 1).join("\n").trim();
  return { frontmatter, body };
}
