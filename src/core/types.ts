export type Severity = "error" | "warn" | "info";

export interface Finding {
  rule: string; // stable id, e.g. "name-kebab-case"
  severity: Severity;
  message: string;
  line?: number; // 1-based line in SKILL.md, when we can pin it down
}

// We only type the frontmatter fields we actually check; everything else on the
// top level just gets its key recorded in extraKeys.
export interface Frontmatter {
  name?: string;
  description?: string;
  extraKeys: string[];
  present: boolean; // did we find a properly closed --- block?
  bodyStartLine: number;
}

export interface Skill {
  dir: string; // directory name; by convention this is also the skill name
  path: string;
  skillMdPath: string;
  raw: string;
  frontmatter: Frontmatter;
  body: string;
}

export interface SkillResult {
  skill: Skill;
  findings: Finding[];
}

export function worstSeverity(findings: Finding[]): Severity | null {
  if (findings.some((f) => f.severity === "error")) return "error";
  if (findings.some((f) => f.severity === "warn")) return "warn";
  if (findings.some((f) => f.severity === "info")) return "info";
  return null;
}
