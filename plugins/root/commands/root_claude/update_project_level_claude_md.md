---
name: root_update_project_level_claude_md
description: Update project CLAUDE.md from template with interactive selection
---

You are updating a project-level CLAUDE.md file from the template.

## Your Task

### Step 1: Select Target Project(s)

First, ask the user which project(s) to update using AskUserQuestion:

```
Question: "Which project(s) should be updated?"
Header: "Target"
multiSelect: true
Options:
  - "All managed repos" - Update CLAUDE.md for all managed repositories
  - "chessarms/calc" - Chess calculation engine repository
  - "chessarms/fishwrap" - Chess fishwrap repository
  - "chessarms/tsmain" - Chess main TypeScript repository
  - "nomadsync-io/tsmain" - NomadSync main TypeScript repository
```

**Important:** Read the list of managed repos dynamically from `C:\KolyaRepositories\claude_root_commander.md` under "Repositories for syncing claude" section. Use those exact paths in the options.

### Step 2: For Each Selected Project

For each selected repository, perform the following:

1. **Check if CLAUDE.md exists**:
   - If exists: Show diff between existing file and template
   - If not exists: Show that a new file will be created from template

2. **Show what would change**:
   - Source: `.claude/templates/project-claude.md`
   - Destination: `<project-path>/CLAUDE.md`
   - Use git diff: `git diff --no-index <project-path>\CLAUDE.md .claude\templates\project-claude.md` (if file exists)
   - If file doesn't exist, show template content that will be created

3. **Ask for confirmation** (for each project individually if multiple selected):
   - Display the diff/changes or new content
   - If no changes and file exists, inform user that files are identical
   - Ask: "Proceed with updating <project-name>/CLAUDE.md?" using AskUserQuestion
   - Options: "Yes, update", "Skip this project", "Show full template"

4. **Copy template if confirmed**:
   - Use PowerShell to copy: `Copy-Item ".claude\templates\project-claude.md" "<project-path>\CLAUDE.md" -Force`
   - Verify the copy succeeded

5. **Report results**:
   - Show which projects were updated successfully
   - Show which were skipped
   - Remind user to:
     - Fill in the "Project Info" section with actual values
     - Customize optional sections as needed
     - Commit the file to the project repository

### Step 3: Final Summary

After processing all selected projects, provide a summary:

```
Summary:
✓ Updated: chessarms/calc, nomadsync-io/tsmain
- Skipped: chessarms/fishwrap (no changes)
✗ Failed: [none]

Next steps:
1. Fill in Project Info section for each updated project
2. Customize optional sections as needed
3. Run /commit in each project to save changes
4. Consider running /root_inspect_claude_setup_health to validate
```

## Example Interaction

```
Which project(s) should be updated?
[User selects: chessarms/calc, nomadsync-io/tsmain]

Processing chessarms/calc...
CLAUDE.md does not exist. Will create new file from template.

[Shows template content preview]

Proceed with updating chessarms/calc/CLAUDE.md?
[User selects: Yes, update]

✓ Created chessarms/calc/CLAUDE.md

Processing nomadsync-io/tsmain...
Comparing existing CLAUDE.md with template...

Changes found:
[diff output]

Proceed with updating nomadsync-io/tsmain/CLAUDE.md?
[User selects: Yes, update]

✓ Updated nomadsync-io/tsmain/CLAUDE.md

Summary:
✓ Updated: chessarms/calc (new), nomadsync-io/tsmain
...
```

## Important Notes

- The template (`.claude/templates/project-claude.md`) is the source of truth
- Each project's CLAUDE.md should be customized after copying
- Project CLAUDE.md files are committed to their respective repositories
- This is different from root CLAUDE.md which lives at workspace root
- Always read managed repos list dynamically from `claude_root_commander.md`
- Process repos in the order they appear in the config file
