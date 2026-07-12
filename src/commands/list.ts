/** `skillsmith list [path]`, show discovered skills and their descriptions. */

import { discoverSkills } from "../core/discover.js";
import { c } from "../core/report.js";

export interface ListOptions {
  paths: string[];
  json: boolean;
}

function truncate(s: string, n: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length <= n ? flat : flat.slice(0, n - 3) + "...";
}

export function runList(opts: ListOptions): number {
  const paths = opts.paths.length ? opts.paths : ["."];
  let skills;
  try {
    skills = discoverSkills(paths);
  } catch (err) {
    console.error(c.red("error: ") + (err as Error).message);
    return 2;
  }

  if (skills.length === 0) {
    console.error(c.yellow("No skills found."));
    return 2;
  }

  if (opts.json) {
    console.log(
      JSON.stringify(
        skills.map((s) => ({
          name: s.frontmatter.name ?? s.dir,
          description: s.frontmatter.description ?? null,
          path: s.skillMdPath,
        })),
        null,
        2
      )
    );
    return 0;
  }

  const width = Math.max(...skills.map((s) => (s.frontmatter.name ?? s.dir).length));
  for (const s of skills) {
    const name = (s.frontmatter.name ?? s.dir).padEnd(width);
    const desc = s.frontmatter.description ? truncate(s.frontmatter.description, 90) : c.gray("(no description)");
    console.log(`${c.bold(name)}  ${c.gray(desc)}`);
  }
  console.log("\n" + c.gray(`${skills.length} skill${skills.length === 1 ? "" : "s"}.`));
  return 0;
}
