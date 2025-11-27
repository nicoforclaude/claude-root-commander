Scan for Git repositories in the workspace and update `repos.json`.

## Required Documentation

**CRITICAL:** Before executing this command, you MUST read and verify existence of:

- `../../docs/plugin-state.md` (relative to this command file) - Contains state directory location and `repos.json` schema

> **⛔ STOP IF NOT FOUND:** If the documentation file cannot be found, **STOP IMMEDIATELY**. Do NOT proceed. Do NOT guess paths or schemas. Escalate to the user and report that the required documentation is missing. This is a hard blocker - the command cannot execute without it.

## Steps

1. **Read documentation** - Load `../../docs/plugin-state.md` (relative to this command) to get state directory path and schema
2. Find all directories containing `.git` folders
3. Collect relative paths from workspace root
4. Write results to plugin state directory as specified in documentation

## Output

Updates `repos.json` with discovered repositories using the schema defined in the documentation.