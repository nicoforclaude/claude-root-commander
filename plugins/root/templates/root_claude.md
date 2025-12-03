# Common Claude Code Instructions

This file has the following sections:
- Workspace setup
- Quick Reference - terminology and skill name mappings
- Key Guidelines - critical rules for Claude Code operation
- Root Setup - applies only when workspace root contains multiple repositories

## Workspace setup

This file is located at the root of the workspace, which might contain multiple repositories.

### Quasi-Variables

These configuration values are available to all child projects:

///INSTRUCTION LINE - remove after copying the template, fill with actual path like `C:\OwnersRepositories\` on next line
CLAUDE_MAIN_WORKSPACE_ROOT = ''
///INSTRUCTION LINE - automatically derived from CLAUDE_MAIN_WORKSPACE_ROOT
CLAUDE_PLUGINS_ROOT = CLAUDE_MAIN_WORKSPACE_ROOT + '\.localData\claude-plugins'

## Quick Reference

### Skills Mapping

When user mentions "X skill", map short names to actual skill names:

| User says | Actual skill name | Plugin/Marketplace | Description |
|-----------|-------------------|-------------------|-------------|
| "editor", "edit", "review" | `nico-dev:editing` | nico-dev@claude-nico-dev | Improves readability, compactness, cohesion |
| "scope" | `nico-dev:scope` | nico-dev@claude-nico-dev | Enforces strict scope boundaries |
| "interview" | `nico-dev:interviewing` | nico-dev@claude-nico-dev | Proactive clarification questions |
| "reuse", "packages" | `nico-dev:reuse` | nico-dev@claude-nico-dev | Prevents code duplication |
| "coding" | `nico-dev:coding` | nico-dev@claude-nico-dev | General coding workflow |
| "markdown", "md" | `nico-dev:markdown-developer` | nico-dev@claude-nico-dev | Markdown file references and linting |
| "shadcn", "ui" | `nico-dev:shadcn-user` | nico-dev@claude-nico-dev | shadcn/ui component guidelines |
| "svelte", "svelte5" | `nico-dev:svelte5-developer` | nico-dev@claude-nico-dev | Svelte 5 syntax and runes |
| "typescript", "ts" | `nico-dev:typescript-developer` | nico-dev@claude-nico-dev | TypeScript conventions and imports |
| "git", "commits" | `git:changes-analyzer` | git@claude-smart-git | Git changes analysis |
| "file", "files", "win", "paths" | `windows-shell:windows-shell` | windows-shell@claude-windows-shell | Windows path handling |
| "joke" | `joke-teller:joke-teller` | joke-teller@claude-humor | Programming jokes |
| "roast" | `roaster:roasting` | roaster@claude-humor | Playful programming roasts |

**Usage:** When user says "use editor skill", invoke `Skill(skill: "nico-dev:editing")`

**Note:** Skills marked "project" are project-level skills, others are from installed plugins.

## Key guidelines

### Critical: Use of skills and agents to perform tasks

You are working with use of skills and agents.
When user asks you to do something, the first thing you do is to carefully analyze what skills and agents should be triggered.
When user says "Read something" it means he asks for opinion, not "read" in technical sense.
When user says fix, you need to understand that it implies proactivity and involvement of "interview if needed" (with interviewing skill).
Before starting any work on human-readable files (docs, code, md files for Claude setup, etc.), make sure you activate **nico-dev:editing** skill before doing actual work, and especially showing to user or writing results to file (whichever first).

#### Use of specific skills and agents

**CRITICAL: Proactively trigger skills from installed plugins!**
**CRITICAL: Read all descriptions of loaded skills and agents and be PROACTIVE in use of them**
**CRITICAL: If one of mentioned below skills is not loaded, notify user of setup error!**

##### Proactive use of skills (SECOND REMINDER)

Some skills are extra reminded to you here, because they are CRITICAL for proper operation.

* **`nico-dev:editing`**
  * Make sure its triggered and used:
    * when User asks for opinion/review/edit of ANY human-readable file (docs, code)
    * Before showing edited content to user
* **`windows-shell:windows-shell`**
  * Make sure its triggered and used:
    * Before any use of Bash tool on Windows
    * When executing shell commands (git, npm, docker, etc.)
    * When working with Windows paths in commands




///INSTRUCTION LINE - here might be extra skills added in future

### Slash commands wrong invocation fix

Normally usage of slash commands is processed by Claude Code system.
But the problem is that sometimes Claude Code itself tries to execute commands directly as plain actions, bypassing the command system.
That happens especially often when lines from user input are sent as "Reminders" while Claude is working on something, for example is inside other command.

In case you see slash command in plain text, like `/commit`, `/linting_check`, `/startup_check`, etc., you should:
- **NOT execute the command**
- Continue work you are doing
- While continuing work, explain to the user: "I noticed you typed `/commit` (or other command). Please run it again after I finish the current work."
- After you have finished work, remind user to run the command again:
  - "I noticed you typed `/commit`. Please run it now so it can be properly triggered."

This prevents race conditions and ensures commands execute cleanly with the intended system pipeline.

### When something goes wrong

When something goes wrong, and user asks "Why didn't you use ... skill?", do not rush into applying that.
User means what he says literally. He wants you to EXPLAIN and INVESTIGATE, so later he can adjust your instructions.
BAD: Treat user's question as hint to use that skill right now.
GOOD: Investigate why that skill was not used.

**CRITICAL: Answer user questions DIRECTLY, do not them as hint to correct something and continue work fixing. **

### Workflow When Changing Files

#### Consistency and cohesion

- Follow the project's established patterns and conventions
- Maintain consistency with existing code style and architecture
- Consider the broader project context when making changes
- Ensure changes align with project goals and requirements

#### Workflow steps

When working on documentation:
* use language specific skills if available (like markdown-formatter skill for MD files)
* make sure you have activated nico-dev:editing skill, if not activated, call nico-dev:editor-agent before showing next code version to the user
* if the project has a linter configured, always run automatic fix on file after you have edited it. this way user will not see linting errors in IDE

When working on code:
* use language specific skills if available (like typescript-developer skill for TS code)
* always call nico-dev:editor-agent before showing next code version to the user
* if the project has a linter configured, always run automatic fix on file after you have edited it. this way user will not see linting errors in IDE

#### Leverage Existing Codebase and Utilities

**Before implementing code changes**, use the Task tool with the nico-dev:reuse-agent to review the
planned changes and check if any functionality could leverage existing utilities from `/packages/`

This way:

1. Subagent decides what's utility-like (not the parent agent)
2. Always check - let the expert agent analyze the changes
3. Catches everything - board operations, formatting, any logic that might already exist

The subagent can say "no, this is all business logic" or "wait, this timing code exists in
/packages/serverUtils/timing".

### Git Commit Policy

**CRITICAL: NEVER create commits unless explicitly requested by the user**

- If user says "good", "ok", "looks good", "great", then that can be acknowledgement of good work (even if you say it's ready to commit!), and it's NOT a commit request or permission
- Only commit when user explicitly says: "commit this", "commit it", "/commit", or similar clear instruction
- When work is complete, STOP and wait for user instruction
- Exception: When using `/commit` command, which has explicit commit flow built-in

**User acknowledgment is NOT permission to commit.** Always wait for explicit commit instruction.

### Scope Management

**When doing implementation work** (fixing bugs, implementing features, modifying code):
- **Always activate the `nico-dev:scope` skill first**
- This ensures strict scope boundaries and prevents scope creep
- The skill will guide you to focus on the specific task and escalate out-of-scope issues

**When NOT needed:**
- Pure research/exploration
- Answering questions about code
- Reading/analyzing without editing


### Content Review and Quality

**When user asks for opinion or review** (documentation, code, tests, Svelte, HTML, any files):
- **Always activate the `nico-dev:editing` skill**
- Applies to ALL file types: text, code, markup, templates, etc.
- Evaluates readability, compactness, and cohesion
- Use when asked "what do you think" or "review this"


### Research and Clarification Guidelines

Before taking significant actions, Claude Code should research context and ask clarifying questions **only when genuinely needed** - not as a formal checklist.

#### Research First, Ask Smart

- Analyze existing codebase to understand patterns, conventions, and project structure
- Use available search capabilities to gather context about similar implementations
- Look for established patterns that provide clear guidance



### Excluded Tools and Configurations

- Avoid suggesting tools that conflict with the existing configuration
- Do not modify core build configurations without explicit request
- Respect the established workspace structure and package management approach
- Maintain compatibility with the existing CI/CD pipeline and deployment processes






## Forbidden File Edits And Commits

**CRITICAL RESTRICTION**: The following files must NEVER be committed by Claude Code under any circumstances:

1. **`package-lock.json`** - Package lock files can cause dependency conflicts and environment inconsistencies across different development setups
2. **`yarn.lock`** - Lock files should be managed by the development team to ensure consistent dependency resolution
3. **`.gitignore`** - Changes to repository ignore patterns can have system-wide implications and must be reviewed by maintainers

### Rationale for Restrictions

These files are critical to repository management and can cause:

- **Dependency conflicts** between different development environments
- **Environment inconsistencies** that break builds for other developers
- **Repository management issues** that affect the entire development workflow
- **Security vulnerabilities** through unintended dependency changes


---


## Root Setup

Apply this section only if the workspace directory is also the project directory (root of all repositories).
Otherwise, skip this ## section and rely on project-specific Claude.md files.

### Purpose

Purpose of root setup is to provide common hoisted functionality of agents, commands, skills to multiple child repositories.

For example, it might be placed in `C:\UserRepositories\` or `~/projects/`.

### Root-prefixed commands

Commands starting with `/root_...` are designed to be executed from the root workspace directory.
They perform operations across multiple child repositories managed under this root. And should not be called from inside child repositories.

### Managing Repositories

The root folder might contain many child repositories, but not all of them should be actively managed (some projects might be archived, experimental, etc.)
Therefore, list of actively managed repositories is maintained in several places.

To add or remove repositories from the managed list, update **two files**:

1. **`claude_root_commander.md`** (at workspace root)
   - Add/remove repository path from "Repositories for syncing claude" section
   - Format: `- \`path/to/repo\``
   - Example: `- \`personal/nicola-solutions\``

2. **`.claude/_resources/run_claude_for_repo.ps1`**
   - Add/remove entry in the `$repos` array (around line 12-18)
   - Specify preferred IDE (WebStorm or IntelliJ)
   - Format: `@{ Name = "path/to/repo"; Path = "path/to/repo"; IDE = "WebStorm" }`
   - Example: `@{ Name = "personal/nicola-solutions"; Path = "personal/nicola-solutions"; IDE = "WebStorm" }`

**Important:** Keep both files synchronized. All repositories in `claude_root_commander.md` should also appear in the PowerShell runner script.

### Exceptions and overrides

If current directory is also workspace root (especially if its name is `C:\KolyaRepositories\` or similar).
That means the git repository is attached to the `.claude` folder. So when performing git operations (/commit, /startup_check), navigate to the `.claude` folder first.

`/startup_check` command will ask you to check git status, so you need to do it after navigating to `.claude` folder.
