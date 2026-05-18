# Project-Specific Claude Code Instructions

## Project Info

**Linting:** (e.g., "antfu" triggers antfu-compliance skill, "eslint" triggers linter-agent, "no" or "planned" skips linting)
**Package manager:** (yarn | npm | pnpm | bun)
**Frameworks:** (e.g., svelte5, node, react, vue3, nextjs)
**TypeScript:** (yes | no)
**Build:** (e.g., vite, webpack, turbo, none)

> **Purpose:** Claude reads this section to activate appropriate skills and agents for your project.
> Edit the values above to match your setup. Use commas for multiple items (e.g., "svelte5, node").

---

## Linting Scripts

*Optional section: Document exact lint script names for your project*

| Script | Purpose |
|--------|---------|
| `yarn lint` | Check all files |
| `yarn lint:changed` | Check changed files only |
| `yarn lint:changed:fix` | Fix changed files |
| `yarn lint:fix:safe` | Fix all files (safe only) |

> **Purpose:** The linter-agent reads this section to know exact script names.
> Adjust the table to match your actual `package.json` scripts.
> **IMPORTANT:** Use exact names - agents must not guess variations.

---

## Skills and Agents

*Optional section: Document project-specific usage of skills/agents*

This section defines details about how specific skills and agents should be applied in this project.
This section should not restate what was already set in workspace (root) CLAUDE.md, only project-specific details.

Examples:
- **reuse skill** - Strongly enforce `/packages/` utilities before writing new code

---

## Code Review Requirements

### Issues Overview Table

At the start of every code review response, output a summary table:

*Example:*

| # | File | Severity | Issue |
|---|------|----------|-------|
| 1 | `src/lib/api/vmApi.svelte.ts` | 🔴 Critical | Null check missing before access |
| 2 | `src/routes/dashboard/+page.svelte` | 🟡 Warning | Unused import |
| 3 | `src/stores/userStore.ts` | 🔵 Info | Consider extracting helper |

Severity levels and emoji set are flexible — adjust categories and icons to fit the review context.

> **Why:** Reviewers need an at-a-glance map of all issues before reading details.
> Without it, the scope of a review is only revealed after reading the entire response.

---

### File Path Resolution

When a review comment references a file by bare name (e.g., `vmApi.svelte.ts`):
1. Use `Glob` to find the full path from repo root
2. Always cite the full path — e.g., `src/lib/api/vmApi.svelte.ts`
3. Never leave a bare filename without a resolved path

> **Why:** Projects contain hundreds of files. A bare filename forces the developer
> to search manually — full paths allow immediate navigation in any IDE or editor.

---

## Exceptions: Imported Code

*Optional section: Document code that should NOT be modified*

This project contains imported code from:
* **[Library name]** in `path/to/imported/code/`
  - **DO NOT modify** - maintained upstream
  - Reason: [why it should remain unchanged]

---

## Excluded Tools and Configurations Specifics

- Dont add files related to:
    - Visual Studio Code (e.g., `.vscode/` directory)
- Don't suggest running NPM commands, instead suggest Yarn commands as the project uses Yarn


## Additional Instructions

*Optional section: Add any project-specific conventions, constraints, or guidelines*

---

## How to Use This Template

1. **Copy to your project:**
   ```bash
   # From workspace root, copy using the update command:
   /root:root_claude:update_project_level_claude_md
   ```

2. **Fill in Project Info section** - Replace placeholder text with your actual setup

3. **Customize optional sections** - Delete sections you don't need, add custom ones as needed

4. **Commit to your project repository** - This file should live in your project, not in `.claude/`

5. **Validation:** Run `/root:health:inspect_repos_health` to check your setup
