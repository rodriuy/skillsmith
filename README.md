# skillsmith

> Scaffold, lint, and audit [Claude Code](https://docs.claude.com/en/docs/claude-code) / Agent **Skills**, with zero runtime dependencies.

A skill lives or dies by its `description`. It's the only thing the model reads to decide *when* to load it. skillsmith checks that description (and everything else about a `SKILL.md`) so your skills actually fire when they should, and catches the boring mistakes before they ship.

```bash
npx skillsmith lint ~/.claude/skills
```

```
ok  good-skill  - clean
!   bad-skill   - ~/.claude/skills/bad-skill/SKILL.md
    ! warn  name "badSkill" should be kebab-case (lowercase letters, digits and single hyphens). [name-kebab-case]:2
    ! warn  name "badSkill" does not match its directory "bad-skill". Claude Code expects them to match. [name-matches-dir]:2
    ! warn  description is only 11 chars. Add concrete trigger phrases so the model knows WHEN to use the skill. [description-too-short]:3
    ! warn  description does not seem to say WHEN to use the skill (no 'use/when/trigger...' cues). [description-triggers]:3
    ! warn  Reference "references/missing.md" does not exist in the skill directory. [broken-reference]:8

Summary: 2 skills - 1 clean - 5 warnings
```

## Why

Skills are easy to write and easy to write *wrong*. The failure modes are quiet.

- A `description` that says *what* the skill does but never *when* to use it, so the model never loads it.
- A `name` that doesn't match its folder, or isn't kebab-case.
- A `SKILL.md` that links to `references/foo.md`, which you renamed three commits ago.
- Two skills that quietly share a name.

None of these throw an error. They just make your skill silently useless. skillsmith turns them into findings you can see, and fail CI on.

## Install

Use it without installing.

```bash
npx skillsmith lint .
```

Or add it to a project.

```bash
npm install --save-dev skillsmith
```

## Commands

### `skillsmith lint [paths...]`

Validate every skill found under the given paths (defaults to the current directory). A "skill" is any directory containing a `SKILL.md`.

```bash
skillsmith lint ~/.claude/skills      # audit your whole skill library
skillsmith lint ./my-skill            # a single skill
skillsmith lint . --strict            # treat warnings as failures (CI)
skillsmith lint . --json              # machine-readable output
skillsmith lint . --quiet             # only show skills with findings
```

Exit codes. `0` clean, `1` findings (errors, or warnings with `--strict`), `2` usage error.

### `skillsmith new <name>`

Scaffold a new skill with a strong starting template, including a `description` written the way descriptions should be written (triggers first).

```bash
skillsmith new pdf-export
skillsmith new pdf-export --dir ~/.claude/skills
```

### `skillsmith list [paths...]`

List discovered skills and their descriptions, a quick index of a skill library.

```bash
skillsmith list ~/.claude/skills
```

## The rules

| Rule | Severity | What it catches |
|---|---|---|
| `frontmatter-present` | error | Missing or unclosed `---` frontmatter block |
| `name-present` | error | No `name` in frontmatter |
| `description-present` | error | No `description`, so the model can't decide when to load the skill |
| `name-unique` | error | Two discovered skills share a `name` |
| `name-kebab-case` | warn | `name` isn't lowercase-kebab-case |
| `name-matches-dir` | warn | `name` differs from its directory |
| `name-length` | warn | `name` over 64 chars |
| `description-too-short` | warn | Description too vague to reliably trigger |
| `description-triggers` | warn | Description describes *what*, not *when* |
| `broken-reference` | warn | A linked local file (like `references/foo.md`) doesn't exist |
| `description-too-long` | info | Description is heavy on context, trim filler |
| `body-nonempty` | warn | The `SKILL.md` body is effectively empty |
| `body-heading` | info | No Markdown heading in the body |

## Use it in CI

```yaml
# .github/workflows/skills.yml
name: Lint skills
on: [push, pull_request]
jobs:
  skills:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx skillsmith lint .claude/skills --strict
```

## Design notes

- **No runtime dependencies.** The frontmatter parser is a small, tested module that handles the YAML subset skills actually use (quoted strings, folded `>` and literal `|` block scalars, nested mappings). Nothing to audit, nothing to install.
- **Every rule maps to a real failure.** Info-level findings are suggestions, warnings are worth fixing, and errors mean the skill won't work. No style nags.
- **Meant for CI.** `--strict` and `--json` are there so you can gate merges on skill quality.

## Contributing

Issues and PRs welcome. New lint rules should map to a real, observable failure mode, so add a fixture under `examples/` and a test.

```bash
npm install
npm run build
npm test
```

## License

MIT
