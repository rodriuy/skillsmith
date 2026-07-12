import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter, splitSkill } from "../src/core/frontmatter.js";

test("parses a plain scalar description", () => {
  const raw = `---\nname: foo\ndescription: When the user wants foo.\n---\n\n# Body`;
  const fm = parseFrontmatter(raw);
  assert.equal(fm.present, true);
  assert.equal(fm.name, "foo");
  assert.equal(fm.description, "When the user wants foo.");
});

test("parses a double-quoted description with an em dash", () => {
  const raw = `---\nname: foo\ndescription: "Use for X — especially Y."\n---\nbody`;
  const fm = parseFrontmatter(raw);
  assert.equal(fm.description, "Use for X — especially Y.");
});

test("parses a folded (>) block scalar", () => {
  const raw = `---\nname: sec\ndescription: >\n  Full audit — use this\n  whenever the user wants a review.\n---\nbody`;
  const fm = parseFrontmatter(raw);
  assert.equal(fm.description, "Full audit — use this whenever the user wants a review.");
});

test("parses a literal (|) block scalar keeping newlines", () => {
  const raw = `---\nname: x\ndescription: |\n  line one\n  line two\n---\nb`;
  const fm = parseFrontmatter(raw);
  assert.equal(fm.description, "line one\nline two");
});

test("records nested metadata as an extra key, not a value", () => {
  const raw = `---\nname: x\ndescription: hi there friend\nmetadata:\n  version: 1.2.3\n---\nb`;
  const fm = parseFrontmatter(raw);
  assert.deepEqual(fm.extraKeys, ["metadata"]);
});

test("reports absent frontmatter", () => {
  const fm = parseFrontmatter(`# Just a heading\n\nno frontmatter`);
  assert.equal(fm.present, false);
});

test("reports unclosed frontmatter as absent", () => {
  const fm = parseFrontmatter(`---\nname: x\ndescription: y`);
  assert.equal(fm.present, false);
});

test("splitSkill separates body from frontmatter", () => {
  const raw = `---\nname: x\ndescription: something useful here\n---\n\n# Title\n\nContent.`;
  const { body } = splitSkill(raw);
  assert.equal(body, "# Title\n\nContent.");
});

test("handles CRLF line endings", () => {
  const raw = `---\r\nname: foo\r\ndescription: When the user wants foo.\r\n---\r\nbody`;
  const fm = parseFrontmatter(raw);
  assert.equal(fm.name, "foo");
  assert.equal(fm.description, "When the user wants foo.");
});
