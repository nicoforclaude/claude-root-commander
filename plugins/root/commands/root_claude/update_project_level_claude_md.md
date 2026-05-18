---
name: root_update_project_level_claude_md
description: Update project CLAUDE.md from template with interactive selection
---

You are updating a project-level CLAUDE.md file from the template.

## Path Configuration

The template is always fetched from the public GitHub repository:
- **Template URL**: `https://raw.githubusercontent.com/nicoforclaude/claude-root-commander/main/plugins/root/templates/project-claude.md`

This ensures the template is always up-to-date regardless of local installation state.

## Your Task

### Step 1: Fetch Template

Use WebFetch to retrieve the template content from the URL in Path Configuration above.

### Step 2: Select Target Project(s)

Ask the user which project(s) to update using AskUserQuestion:

Read the list of managed repos from `<CLAUDE_MAIN_WORKSPACE_ROOT>/claude_root_commander.md` under "Repositories for syncing claude". Build the options dynamically:
- First option: "All managed repos" — update all
- Remaining options: one per repo path from the config file

### Step 3: For Each Selected Project

For each selected repository, perform the following:

1. **Check if CLAUDE.md exists**:
   - If exists: Show diff between existing file and template
   - If not exists: Show that a new file will be created from template

2. **Show what would change**:
   - Source: fetched template content (from GitHub)
   - Destination: `<project-path>/CLAUDE.md`
   - Write template to a temp file, then: `git diff --no-index "<project-path>\CLAUDE.md" "<temp-file>"` (if file exists)
   - If file doesn't exist, show template content that will be created

3. **Ask for confirmation** (for each project individually if multiple selected):
   - Display the diff/changes or new content
   - If no changes and file exists, inform user that files are identical
   - Ask: "Proceed with updating <project-name>/CLAUDE.md?" using AskUserQuestion
   - Options: "Yes, update", "Skip this project", "Show full template"

4. **Write template if confirmed**:
   - Write the fetched template content to `<project-path>\CLAUDE.md` using the Write tool
   - Verify the write succeeded

5. **Report results**:
   - Show which projects were updated successfully
   - Show which were skipped
   - Remind user to:
     - Fill in the "Project Info" section with actual values
     - Customize optional sections as needed
     - Commit the file to the project repository

### Step 4: Final Summary

After processing all selected projects, provide a summary:

```
Summary:
✓ Updated: org/repo-a, org/repo-b
- Skipped: org/repo-c (no changes)
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
[User selects: org/repo-a, org/repo-b]

Processing org/repo-a...
CLAUDE.md does not exist. Will create new file from template.

[Shows template content preview]

Proceed with updating org/repo-a/CLAUDE.md?
[User selects: Yes, update]

✓ Created org/repo-a/CLAUDE.md

Processing org/repo-b...
Comparing existing CLAUDE.md with template...

Changes found:
[diff output]

Proceed with updating org/repo-b/CLAUDE.md?
[User selects: Yes, update]

✓ Updated org/repo-b/CLAUDE.md

Summary:
✓ Updated: org/repo-a (new), org/repo-b
...
```

## Important Notes

- The template on GitHub is the source of truth — always fetched fresh
- Each project's CLAUDE.md should be customized after copying
- Project CLAUDE.md files are committed to their respective repositories
- This is different from root CLAUDE.md which lives at workspace root
- Always read managed repos list dynamically from `claude_root_commander.md`
- Process repos in the order they appear in the config file
