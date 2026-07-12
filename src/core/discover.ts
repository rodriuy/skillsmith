/** Locate and load skills (directories containing a SKILL.md) from disk. */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { splitSkill } from "./frontmatter.js";
import type { Skill } from "./types.js";

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage"]);
const SKILL_FILE = "SKILL.md";

function loadSkill(dir: string): Skill {
  const skillMdPath = join(dir, SKILL_FILE);
  const raw = readFileSync(skillMdPath, "utf8");
  const { frontmatter, body } = splitSkill(raw);
  return {
    dir: basename(dir),
    path: dir,
    skillMdPath,
    raw,
    frontmatter,
    body,
  };
}

function findSkillDirs(root: string, depth: number, out: Set<string>): void {
  if (depth < 0) return;
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return;
  }
  if (entries.includes(SKILL_FILE)) {
    out.add(root);
    // A skill directory is a leaf for us, so we don't recurse into it.
    return;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry) || entry.startsWith(".")) continue;
    const full = join(root, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) findSkillDirs(full, depth - 1, out);
  }
}

/**
 * Resolve a list of input paths into loaded skills.
 * Each path may be a SKILL.md file, a skill directory, or a directory tree to scan.
 */
export function discoverSkills(inputs: string[], maxDepth = 6): Skill[] {
  const dirs = new Set<string>();
  for (const input of inputs) {
    const abs = resolve(input);
    if (!existsSync(abs)) {
      throw new Error(`Path not found: ${input}`);
    }
    const st = statSync(abs);
    if (st.isFile()) {
      if (basename(abs) === SKILL_FILE) dirs.add(resolve(abs, ".."));
      else throw new Error(`Not a SKILL.md file: ${input}`);
    } else if (st.isDirectory()) {
      findSkillDirs(abs, maxDepth, dirs);
    }
  }
  return [...dirs]
    .sort()
    .map(loadSkill);
}
