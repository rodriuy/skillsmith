/** Terminal formatting for lint output. Zero dependencies; respects NO_COLOR. */

import type { Severity, SkillResult } from "./types.js";

const ESC = String.fromCharCode(27); // avoid embedding a raw escape byte in source

const useColor =
  process.env.NO_COLOR === undefined &&
  process.env.TERM !== "dumb" &&
  process.stdout.isTTY === true;

function paint(code: number, s: string): string {
  return useColor ? `${ESC}[${code}m${s}${ESC}[0m` : s;
}

export const c = {
  red: (s: string) => paint(31, s),
  yellow: (s: string) => paint(33, s),
  blue: (s: string) => paint(34, s),
  green: (s: string) => paint(32, s),
  gray: (s: string) => paint(90, s),
  bold: (s: string) => paint(1, s),
};

const SEV_LABEL: Record<Severity, string> = {
  error: c.red("error"),
  warn: c.yellow("warn "),
  info: c.blue("info "),
};

const SEV_ICON: Record<Severity, string> = {
  error: c.red("x"),
  warn: c.yellow("!"),
  info: c.blue("i"),
};

export interface Totals {
  error: number;
  warn: number;
  info: number;
  skills: number;
  clean: number;
}

export function tallyTotals(results: SkillResult[]): Totals {
  const t: Totals = { error: 0, warn: 0, info: 0, skills: results.length, clean: 0 };
  for (const r of results) {
    if (r.findings.length === 0) t.clean++;
    for (const f of r.findings) t[f.severity]++;
  }
  return t;
}

/** Human-readable report. Returns the full string to print. */
export function formatReport(results: SkillResult[]): string {
  const out: string[] = [];
  for (const { skill, findings } of results) {
    if (findings.length === 0) {
      out.push(`${c.green("ok")} ${c.bold(skill.dir)} ${c.gray("- clean")}`);
      continue;
    }
    const worst = findings.some((f) => f.severity === "error") ? c.red("x") : c.yellow("!");
    out.push(`${worst} ${c.bold(skill.dir)} ${c.gray("- " + skill.skillMdPath)}`);
    for (const f of findings) {
      const loc = f.line ? c.gray(`:${f.line}`) : "";
      out.push(`    ${SEV_ICON[f.severity]} ${SEV_LABEL[f.severity]} ${f.message} ${c.gray(`[${f.rule}]`)}${loc}`);
    }
  }
  return out.join("\n");
}

export function formatSummary(t: Totals): string {
  const parts: string[] = [];
  parts.push(`${t.skills} skill${t.skills === 1 ? "" : "s"}`);
  parts.push(`${c.green(String(t.clean))} clean`);
  if (t.error) parts.push(c.red(`${t.error} error${t.error === 1 ? "" : "s"}`));
  if (t.warn) parts.push(c.yellow(`${t.warn} warning${t.warn === 1 ? "" : "s"}`));
  if (t.info) parts.push(c.blue(`${t.info} info`));
  return c.bold("Summary: ") + parts.join(c.gray(" - "));
}
