import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { discoverSkills } from "../src/core/discover.js";
import { buildContext, lintSkill } from "../src/core/rules.js";
import type { Skill } from "../src/core/types.js";

const examplesDir = fileURLToPath(new URL("../../examples", import.meta.url));

function lintDir(dir: string) {
  const skills = discoverSkills([dir]);
  const ctx = buildContext(skills);
  return skills.map((s) => ({ skill: s, findings: lintSkill(s, ctx) }));
}

function rulesFor(dir: string, wantDir: string): Set<string> {
  const results = lintDir(dir);
  const r = results.find((x) => x.skill.dir === wantDir);
  assert.ok(r, `expected to find skill ${wantDir}`);
  return new Set(r!.findings.map((f) => f.rule));
}

test("the good example lints clean", () => {
  const rules = rulesFor(examplesDir, "good-skill");
  assert.deepEqual([...rules], [], "good-skill should have no findings");
});

test("the bad example flags the expected problems", () => {
  const rules = rulesFor(examplesDir, "bad-skill");
  assert.ok(rules.has("name-kebab-case"), "badSkill name is not kebab-case");
  assert.ok(rules.has("name-matches-dir"), "name does not match directory");
  assert.ok(rules.has("description-too-short"), "description is too short");
  assert.ok(rules.has("description-triggers"), "description lacks trigger cues");
  assert.ok(rules.has("broken-reference"), "references/missing.md does not exist");
});

test("missing frontmatter short-circuits to a single error", () => {
  const skill: Skill = {
    dir: "no-fm",
    path: "/tmp/no-fm",
    skillMdPath: "/tmp/no-fm/SKILL.md",
    raw: "# Just a body",
    frontmatter: { present: false, extraKeys: [], bodyStartLine: 1 },
    body: "# Just a body",
  };
  const findings = lintSkill(skill, { nameCounts: new Map() });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "frontmatter-present");
  assert.equal(findings[0].severity, "error");
});

test("duplicate names are reported as errors", () => {
  const mk = (path: string): Skill => ({
    dir: path.split("/").pop()!,
    path,
    skillMdPath: `${path}/SKILL.md`,
    raw: `---\nname: dup\ndescription: When the user wants a duplicate thing to test.\n---\nbody here`,
    frontmatter: {
      name: "dup",
      description: "When the user wants a duplicate thing to test.",
      present: true,
      extraKeys: [],
      bodyStartLine: 4,
    },
    body: "body here with enough length",
  });
  const skills = [mk("/a/dup"), mk("/b/dup")];
  const ctx = buildContext(skills);
  const findings = lintSkill(skills[0], ctx);
  assert.ok(findings.some((f) => f.rule === "name-unique" && f.severity === "error"));
});
