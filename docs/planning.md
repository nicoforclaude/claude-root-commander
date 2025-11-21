

## Current

```text
Select a repository to run:
=================================
> 1. Root (workspace)
  2. chessarms/tsmain
  3. chessarms/calc
  4. chessarms/fishwrap
  5. nomadsync-io/tsmain
  6. personal/nicola-solutions
  7. nicoforclaude (workspace)
=================================

Current Mode: [Claude][none]
Tab/w: switch mode | c: startup mode | Up/Down: navigate | Enter: select | 1-7: direct | q: quit
```
## Desired

Problems:
workspaces
cannot go into workspaces

Some repos are nice to see always like:
- chessarms/tsmain
- personal/nicola-solutions
- nomadsync-io/tsmain

Some would be nice to be openable after navigation to workspace, like:
- nicoforclaude (workspace).
After navigation I would see repos with specific Claude Plugin marketplaces, like nicoforclaude/windows-shell.


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

...

Behaviours:
- `open`: always show this entry in the main list and is opened by path by Claude and IDE
- `hoist`: show children in the main list, but not this entry
- `closed`: do not show this entry or its children in the main list, but allow




