**Note:** Private planning files with local paths should be stored in `docs/.local/` (gitignored).

## Current

```text
Select a repository to run:
=================================
> 1. Root (workspace)
  2. org/project-a
  3. org/project-b
  4. plugins (workspace)
=================================

Current Mode: [Claude][none]
Tab/w: switch mode | c: startup mode | Up/Down: navigate | Enter: select | 1-4: direct | q: quit
```

## Problems

- Cannot navigate into workspace entries
- Flat list doesn't reflect workspace hierarchy
- **TODO: Private paths in documentation** - The following files contain private repo paths and need genericization:
  - `plugins/root/commands/runner/prepare_runner_script.md` (multiple references)
  - `plugins/root/commands/health/print_repos_health.md` (example output)
  - `plugins/root/commands/health/inspect_root_health.md` (examples)
  - `plugins/root/commands/health/inspect_repos_health.md` (extensive examples)
  - `docs/planning.md` (JSON example still has old paths - lines 57, 65, 70)

## Requirements

**Always visible repos:** Some repos should always appear in main list

**Hierarchical access:** Workspaces should be navigable to show child repos


## Suggested storage

```json
{
  "modes": [
    
  ],
  "ides": [
    {
      "name": "Webstorm",
      "path": "/path/to/webstorm"
    },
    {
      "name": "IntelliJ",
      "path": "/path/to/webstorm"
    }
  ],
  "entries": [
    {
      "type": "workspace",
      "path": ".",
      "name": "Root",
      "children": [],
      "behaviour": "open"
    },
    {
      "type": "workspace",
      "path": "chessarms",
      "behaviour": "hoist",
      "children": [
      ],
      "openableAsRoot": false
    },
    {
      "type": "workspace",
      "path": "nomadsync-io",
      "behaviour": "hoist",
      "children": [
        {
          "type": "repo",
          "path": "nomadsync-io/tsmain",
          "ide": "Webstorm"
        }
      ],
      "openableAsRoot": false
    }
  ],
  "unmentioned": [],
}

```

### Explanation of `behaviour` field

Behaviours:
- `open`: always show this entry in the main list and is opened by path by Claude and IDE
- `hoist`: show children in the main list, but not this entry
- `hidden`: user decided not to show this repo in the main list




