/** `skillsmith lint [paths...]`, validate one or more skills. */

import { discoverSkills } from "../core/discover.js";
import { buildContext, lintSkill } from "../core/rules.js";
import { formatReport, formatSummary, tallyTotals, c } from "../core/report.js";
import type { SkillResult } from "../core/types.js";

export interface LintOptions {
  paths: string[];
  strict: boolean;
  quiet: boolean;
  json: boolean;
}

export function runLint(opts: LintOptions): number {
  const paths = opts.paths.length ? opts.paths : ["."];
  let skills;
  try {
    skills = discoverSkills(paths);
  } catch (err) {
    console.error(c.red("error: ") + (err as Error).message);
    return 2;
  }

  if (skills.length === 0) {
    console.error(c.yellow("No skills found.") + c.gray(" Looked for SKILL.md under " + paths.join(", ")));
    return 2;
  }

  const ctx = buildContext(skills);
  const results: SkillResult[] = skills.map((skill) => ({ skill, findings: lintSkill(skill, ctx) }));
  const totals = tallyTotals(results);

  if (opts.json) {
    const payload = {
      summary: totals,
      results: results.map((r) => ({
        name: r.skill.frontmatter.name ?? null,
        dir: r.skill.dir,
        path: r.skill.skillMdPath,
        findings: r.findings,
      })),
    };
    console.log(JSON.stringify(payload, null, 2));
  } else {
    const shown = opts.quiet ? results.filter((r) => r.findings.length > 0) : results;
    if (shown.length) console.log(formatReport(shown));
    console.log("\n" + formatSummary(totals));
  }

  const failed = totals.error > 0 || (opts.strict && totals.warn > 0);
  return failed ? 1 : 0;
}
