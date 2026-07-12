#!/usr/bin/env node
/** skillsmith CLI entry point. Hand-rolled arg parsing keeps deps at zero. */

import { readFileSync } from "node:fs";
import { runLint } from "./commands/lint.js";
import { runList } from "./commands/list.js";
import { runNew } from "./commands/new.js";
import { c } from "./core/report.js";

function version(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const HELP = `${c.bold("skillsmith")} - scaffold, lint and audit Claude Code / Agent Skills

${c.bold("Usage:")}
  skillsmith <command> [options]

${c.bold("Commands:")}
  new <name>          Scaffold a new skill directory with a strong template
  lint [paths...]     Validate skills (default: current directory)
  list [paths...]     List discovered skills and their descriptions
  help                Show this help
  version             Print the version

${c.bold("Lint options:")}
  --strict            Treat warnings as failures (exit 1). Good for CI.
  --quiet             Only print skills that have findings
  --json              Machine-readable output

${c.bold("New options:")}
  --dir <path>        Parent directory to create the skill in (default: .)
  --force             Overwrite an existing SKILL.md

${c.bold("Examples:")}
  skillsmith new pdf-export
  skillsmith lint ~/.claude/skills
  skillsmith lint . --strict
  skillsmith list ~/.claude/skills

Exit codes: 0 = clean, 1 = findings (errors, or warnings with --strict), 2 = usage error.
`;

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function flagValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

function positionals(args: string[], valueFlags: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("-")) {
      if (valueFlags.includes(a)) i++; // skip its value
      continue;
    }
    out.push(a);
  }
  return out;
}

function main(argv: string[]): number {
  const [command, ...rest] = argv;

  switch (command) {
    case undefined:
    case "help":
    case "-h":
    case "--help":
      console.log(HELP);
      return 0;

    case "version":
    case "-v":
    case "--version":
      console.log(version());
      return 0;

    case "lint":
      return runLint({
        paths: positionals(rest, []),
        strict: hasFlag(rest, "--strict"),
        quiet: hasFlag(rest, "--quiet"),
        json: hasFlag(rest, "--json"),
      });

    case "list":
      return runList({
        paths: positionals(rest, []),
        json: hasFlag(rest, "--json"),
      });

    case "new": {
      const names = positionals(rest, ["--dir"]);
      return runNew({
        name: names[0] ?? "",
        dir: flagValue(rest, "--dir") ?? ".",
        force: hasFlag(rest, "--force"),
      });
    }

    default:
      console.error(c.red("error: ") + `unknown command "${command}".\n`);
      console.log(HELP);
      return 2;
  }
}

process.exit(main(process.argv.slice(2)));
