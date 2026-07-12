# skillsmith

**Creá, revisá y auditá skills de Claude Code / Agent, sin una sola dependencia.** 🔨

**Español** · [English](#english)

[![CI](https://github.com/rodriuy/skillsmith/actions/workflows/ci.yml/badge.svg)](https://github.com/rodriuy/skillsmith/actions/workflows/ci.yml) ![license](https://img.shields.io/badge/license-MIT-blue)

Una skill vive o muere por su `description`. Es lo único que el modelo lee para decidir *cuándo* cargarla. Si está mal escrita, la skill queda ahí, muda, ocupando lugar, y nadie te avisa. skillsmith te marca eso, y todo lo demás que puede estar mal en un `SKILL.md`, antes de que se te escape.

### 🤔 Por qué lo hice

Tenía un montón de skills instaladas y un día caí en que no tenía forma de saber cuáles estaban rotas, o por qué algunas nunca se activaban. Le pasé la herramienta a mi propia carpeta y encontró cuatro con el frontmatter mal armado y hasta un nombre repetido. Ahí dije, bueno, valía la pena.

### 🚀 Probalo

```bash
npx @rodriuy/skillsmith lint ~/.claude/skills
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

### 🧰 Comandos

**`skillsmith lint [rutas...]`** revisa cada skill que encuentre bajo las rutas que le pases (por defecto, la carpeta actual). Una "skill" es cualquier carpeta con un `SKILL.md` adentro.

```bash
skillsmith lint ~/.claude/skills      # auditá toda tu biblioteca
skillsmith lint ./mi-skill            # una sola
skillsmith lint . --strict            # los warnings también fallan (para CI)
skillsmith lint . --json              # salida para máquinas
skillsmith lint . --quiet             # mostrá solo las que tienen algo
```

Códigos de salida. `0` limpio, `1` hallazgos (errores, o warnings con `--strict`), `2` error de uso.

**`skillsmith new <nombre>`** te arma una skill nueva con un template que ya trae la `description` escrita como se debe, con los triggers adelante.

**`skillsmith list [rutas...]`** te lista las skills que encuentra con su descripción, un índice rápido de tu biblioteca.

Si lo instalás global (`npm i -g @rodriuy/skillsmith`), el comando queda como `skillsmith` a secas.

### 📋 Las reglas

| Regla | Nivel | Qué agarra |
|---|---|---|
| `frontmatter-present` | error | Falta el bloque `---` o quedó sin cerrar |
| `name-present` | error | No hay `name` en el frontmatter |
| `description-present` | error | No hay `description`, el modelo no puede decidir cuándo cargarla |
| `name-unique` | error | Dos skills comparten el mismo `name` |
| `name-kebab-case` | warn | El `name` no está en minúscula-kebab-case |
| `name-matches-dir` | warn | El `name` no coincide con su carpeta |
| `name-length` | warn | `name` de más de 64 caracteres |
| `description-too-short` | warn | Descripción muy vaga para disparar tranquila |
| `description-triggers` | warn | La descripción dice *qué* hace, no *cuándo* usarla |
| `broken-reference` | warn | Un archivo local linkeado (como `references/foo.md`) no existe |
| `description-too-long` | info | Descripción pesada de contexto, recortá relleno |
| `body-nonempty` | warn | El cuerpo del `SKILL.md` está prácticamente vacío |
| `body-heading` | info | El cuerpo no tiene ningún título Markdown |

### ⚙️ En CI

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
      - run: npx @rodriuy/skillsmith lint .claude/skills --strict
```

### 🤝 Contribuir

Los issues y PRs son bienvenidos. Cada regla nueva tendría que mapear a una forma real y observable de que una skill se rompe, así que sumá un fixture en `examples/` y un test.

```bash
npm install
npm run build
npm test
```

Cero dependencias en runtime. El parser de frontmatter es un módulo chico y testeado que banca el subconjunto de YAML que las skills usan de verdad. Nada que auditar, nada que instalar.

Hecho en Uruguay 🇺🇾 por [rodriuy](https://github.com/rodriuy). MIT.

---

## English

[Español](#skillsmith) · **English**

**Scaffold, lint and audit Claude Code / Agent Skills, with zero runtime dependencies.** 🔨

A skill lives or dies by its `description`. It's the only thing the model reads to decide *when* to load it. If it's written badly the skill just sits there, mute, taking up space, and nothing warns you. skillsmith flags that, and everything else that can be wrong in a `SKILL.md`, before it ships.

### 🤔 Why I built it

I had a pile of skills installed and one day it hit me that I had no way to know which ones were broken, or why some never fired. I ran this against my own folder and it found four with busted frontmatter and even a duplicate name. That settled it, worth doing.

### 🚀 Try it

```bash
npx @rodriuy/skillsmith lint ~/.claude/skills
```

### 🧰 Commands

**`skillsmith lint [paths...]`** checks every skill found under the given paths (defaults to the current directory). A "skill" is any directory with a `SKILL.md` in it.

```bash
skillsmith lint ~/.claude/skills      # audit your whole library
skillsmith lint ./my-skill            # a single one
skillsmith lint . --strict            # warnings fail too (for CI)
skillsmith lint . --json              # machine-readable output
skillsmith lint . --quiet             # only show skills with findings
```

Exit codes. `0` clean, `1` findings (errors, or warnings with `--strict`), `2` usage error.

**`skillsmith new <name>`** scaffolds a new skill from a template that already writes the `description` the right way, triggers first.

**`skillsmith list [paths...]`** lists the skills it finds with their description, a quick index of your library.

Installed globally (`npm i -g @rodriuy/skillsmith`), the command is just `skillsmith`.

### 📋 The rules

| Rule | Level | What it catches |
|---|---|---|
| `frontmatter-present` | error | Missing or unclosed `---` frontmatter block |
| `name-present` | error | No `name` in the frontmatter |
| `description-present` | error | No `description`, so the model can't decide when to load it |
| `name-unique` | error | Two skills share the same `name` |
| `name-kebab-case` | warn | `name` isn't lowercase-kebab-case |
| `name-matches-dir` | warn | `name` differs from its directory |
| `name-length` | warn | `name` over 64 chars |
| `description-too-short` | warn | Description too vague to trigger reliably |
| `description-triggers` | warn | Description says *what* it does, not *when* to use it |
| `broken-reference` | warn | A linked local file (like `references/foo.md`) doesn't exist |
| `description-too-long` | info | Description is heavy on context, trim filler |
| `body-nonempty` | warn | The `SKILL.md` body is basically empty |
| `body-heading` | info | No Markdown heading in the body |

### 🤝 Contributing

Issues and PRs welcome. A new rule should map to a real, observable way a skill breaks, so add a fixture under `examples/` and a test.

```bash
npm install
npm run build
npm test
```

Zero runtime dependencies. The frontmatter parser is a small, tested module that handles the YAML subset skills actually use. Nothing to audit, nothing to install.

Made in Uruguay 🇺🇾 by [rodriuy](https://github.com/rodriuy). MIT.
