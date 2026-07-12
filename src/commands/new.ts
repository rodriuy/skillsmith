/** `skillsmith new <name>`, scaffold a new skill directory. */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { c } from "../core/report.js";

export interface NewOptions {
  name: string;
  dir: string;
  force: boolean;
}

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function template(name: string): string {
  const title = name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `---
name: ${name}
description: When the user wants to <do the thing this skill does>. Also use when the user mentions "<trigger phrase>", "<another phrase>", or "<a natural way someone asks for this>". Use this whenever <the situation> comes up. Describe WHEN to trigger, not just what the skill does.
metadata:
  version: 0.1.0
---

# ${title}

<One or two sentences on what this skill is for and the outcome it produces.>

## When to use this

- <Concrete situation 1>
- <Concrete situation 2>

## Steps

1. <First thing to do>
2. <Next thing>
3. <How to finish and report back>

## Notes

- Keep this file lean. Move long reference material into \`references/\` and link to it.
- Anything runnable goes in \`scripts/\`.
`;
}

export function runNew(opts: NewOptions): number {
  if (!opts.name) {
    console.error(c.red("error: ") + "a skill name is required, e.g. `skillsmith new my-skill`.");
    return 2;
  }
  if (!KEBAB_RE.test(opts.name)) {
    console.error(c.red("error: ") + `"${opts.name}" is not kebab-case. Use lowercase letters, digits and single hyphens.`);
    return 2;
  }

  const skillDir = resolve(opts.dir, opts.name);
  const skillMd = join(skillDir, "SKILL.md");

  if (existsSync(skillMd) && !opts.force) {
    console.error(c.red("error: ") + `${skillMd} already exists. Use --force to overwrite.`);
    return 1;
  }

  mkdirSync(skillDir, { recursive: true });
  writeFileSync(skillMd, template(opts.name), "utf8");

  console.log(`${c.green("created")} ${c.bold(opts.name)}`);
  console.log(c.gray("  " + skillMd));
  console.log("\nNext, edit the description (the trigger is what makes the skill fire), then run");
  console.log(c.gray(`  skillsmith lint ${opts.dir === "." ? opts.name : join(opts.dir, opts.name)}`));
  return 0;
}
