// The lint rules. Each one maps to a concrete way a skill breaks. It won't be
// picked up by the model, it's malformed, or it points at something missing.
// Rules just return findings, formatting and exit codes live in the CLI.

import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Finding, Skill } from "./types.js";

// Passed to every rule so cross-skill checks (duplicate names) are possible.
export interface LintContext {
  nameCounts: Map<string, number>;
}

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// If none of these show up, the description probably says what the skill does
// but not when to reach for it, which is what actually gates loading.
const TRIGGER_CUES = /\b(use|when|trigger|whenever|if the user|invoke|mentions?)\b/i;
const HEADING_RE = /^#{1,6}\s+\S/m;

/** 1-based line of the first occurrence of `needle`, or undefined. */
function lineOf(raw: string, needle: string): number | undefined {
  const idx = raw.indexOf(needle);
  if (idx === -1) return undefined;
  return raw.slice(0, idx).split("\n").length;
}

// Pull relative file links out of the body. We scan the raw file (not the
// trimmed body) from `fromLine` on, so the line numbers we report are real.
function extractLocalRefs(raw: string, fromLine: number): { ref: string; line: number }[] {
  const refs: { ref: string; line: number }[] = [];
  const lines = raw.split("\n");
  // Only Markdown link targets like [text](target). Backticked paths are almost
  // always illustrative or runtime-generated files, and flagging them is noise.
  const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    if (lineNo < fromLine) return;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(line))) push(m[1], lineNo);
  });

  function push(rawTarget: string, lineNo: number): void {
    let target = rawTarget.trim();
    // Drop anchors / queries.
    target = target.split("#")[0].split("?")[0].split(" ")[0];
    if (!target) return;
    // Skip URLs, absolute paths, home paths, parent traversal and anchors.
    if (/^[a-z]+:/i.test(target)) return; // http:, mailto:, file:, etc.
    if (target.startsWith("/") || target.startsWith("#")) return;
    if (target.startsWith("~")) return; // home paths are not skill-local
    if (target.includes("..")) return; // cross-skill/parent refs are ambiguous
    if (/[<>{}$*]/.test(target)) return; // placeholders like <path> or {var}
    // Skip likely placeholders, uppercase runs (XX) or `-N.` single-letter stems.
    if (/[A-Z]{2,}/.test(target) || /-[A-Z]\./.test(target)) return;
    // Must look like a file, so it needs a slash and a dotted extension.
    if (!target.includes("/")) return;
    if (!/\.[a-z0-9]{1,6}$/i.test(target)) return;
    refs.push({ ref: target.replace(/^\.\//, ""), line: lineNo });
  }

  return refs;
}

export function lintSkill(skill: Skill, ctx: LintContext): Finding[] {
  const findings: Finding[] = [];
  const fm = skill.frontmatter;
  const add = (rule: string, severity: Finding["severity"], message: string, line?: number) =>
    findings.push({ rule, severity, message, line });

  // --- Frontmatter presence ---
  if (!fm.present) {
    add("frontmatter-present", "error", "No YAML frontmatter found. SKILL.md must open with a `---` block.");
    // Without frontmatter, downstream field rules are meaningless.
    return findings;
  }

  // --- name ---
  const name = fm.name?.trim();
  if (!name) {
    add("name-present", "error", "Frontmatter is missing a `name`.");
  } else {
    if (!KEBAB_RE.test(name)) {
      add(
        "name-kebab-case",
        "warn",
        `name "${name}" should be kebab-case (lowercase letters, digits and single hyphens).`,
        lineOf(skill.raw, "name:")
      );
    }
    if (name !== skill.dir) {
      add(
        "name-matches-dir",
        "warn",
        `name "${name}" does not match its directory "${skill.dir}". Claude Code expects them to match.`,
        lineOf(skill.raw, "name:")
      );
    }
    if (name.length > 64) {
      add("name-length", "warn", `name is ${name.length} chars, keep it under 64.`);
    }
    if ((ctx.nameCounts.get(name) ?? 0) > 1) {
      add("name-unique", "error", `Duplicate skill name "${name}" found in the scanned set. Names must be unique.`);
    }
  }

  // --- description ---
  const desc = fm.description?.trim();
  const descLine = lineOf(skill.raw, "description:");
  if (!desc) {
    add("description-present", "error", "Frontmatter is missing a `description`. This is what the model uses to decide when to load the skill.", descLine);
  } else {
    if (desc.length < 40) {
      add("description-too-short", "warn", `description is only ${desc.length} chars. Add concrete trigger phrases so the model knows WHEN to use the skill.`, descLine);
    }
    if (desc.length > 1500) {
      add("description-too-long", "info", `description is ${desc.length} chars. Long is fine if it is all triggers, but trim filler, it costs context on every turn.`, descLine);
    }
    if (!TRIGGER_CUES.test(desc)) {
      add("description-triggers", "warn", "description does not seem to say WHEN to use the skill (no 'use/when/trigger...' cues). Add trigger phrases, not just a summary of what it does.", descLine);
    }
  }

  // --- body ---
  const body = skill.body.trim();
  if (body.length < 20) {
    add("body-nonempty", "warn", "SKILL.md body is essentially empty. Add the instructions the skill should follow.");
  } else if (!HEADING_RE.test(body)) {
    add("body-heading", "info", "Body has no Markdown heading. A short title/overview helps readers and the model.");
  }

  // --- broken local references ---
  const bodyFrom = fm.present ? fm.bodyStartLine : 1;
  for (const { ref, line } of extractLocalRefs(skill.raw, bodyFrom)) {
    const target = join(skill.path, ref);
    let ok = existsSync(target);
    if (ok) {
      try {
        // A directory reference with an extension is suspicious but allowed.
        statSync(target);
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      add("broken-reference", "warn", `Reference "${ref}" does not exist in the skill directory.`, line);
    }
  }

  return findings;
}

/** Build a LintContext from all discovered skills. */
export function buildContext(skills: Skill[]): LintContext {
  const nameCounts = new Map<string, number>();
  for (const s of skills) {
    const n = s.frontmatter.name?.trim();
    if (n) nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1);
  }
  return { nameCounts };
}
