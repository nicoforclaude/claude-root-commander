#!/usr/bin/env node
/**
 * Claude Root Launcher
 *
 * Interactive menu for selecting repositories/workspaces and opening them
 * with Claude and/or IDEs.
 *
 * Usage:
 *   node launcher.js --workspace-root <path> --state-dir <path> [options]
 *
 * Required:
 *   --workspace-root  Workspace root directory (where repos live)
 *   --state-dir       Plugin state directory (for config files)
 *
 * Options:
 *   --setup     Run interactive setup wizard
 *   --config    Show current configuration
 *   --help      Show help
 *
 * Note: Use the wrapper scripts (launcher.ps1 / launcher.sh) which
 * automatically provide the correct paths.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

// ============================================================================
// ANSI Escape Codes
// ============================================================================

const ANSI = {
  clear: '\x1b[2J\x1b[H',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  red: '\x1b[31m',

  // Background colors
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgGray: '\x1b[100m',
};

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(argv) {
  const args = {
    workspaceRoot: null,
    pluginsRoot: null,
    stateDir: null,
    setup: false,
    config: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--workspace-root':
        args.workspaceRoot = argv[++i];
        break;
      case '--plugins-root':
        args.pluginsRoot = argv[++i];
        break;
      case '--state-dir':
        args.stateDir = argv[++i];
        break;
      case '--setup':
        args.setup = true;
        break;
      case '--config':
        args.config = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

// Global paths (set from CLI args)
let WORKSPACE_ROOT = null;
let STATE_DIR = null;

// Config file paths
function getConfigPaths() {
  return {
    repos: path.join(STATE_DIR, 'repos.json'),
    config: path.join(STATE_DIR, 'runner-config.json'),
    diffs: path.join(STATE_DIR, 'diffs.json'),
  };
}

// ============================================================================
// Config Loading/Saving
// ============================================================================

function loadJson(filePath, defaultValue = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Warning: Failed to load ${filePath}: ${e.message}`);
  }
  return defaultValue;
}

function saveJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadConfig() {
  const paths = getConfigPaths();

  // Load repos.json
  const reposData = loadJson(paths.repos, { repositories: [] });

  // Load runner-config.json
  let config = loadJson(paths.config);

  if (!config) {
    // Create default config from repos
    config = createDefaultConfig(reposData.repositories);
    saveJson(paths.config, config);
  } else {
    // Ensure unmanagedPaths exists (for existing configs)
    if (!config.unmanagedPaths) {
      config.unmanagedPaths = [];
    }
  }

  // Load diffs.json
  const diffs = loadJson(paths.diffs, {});

  return { config, repos: reposData, diffs };
}

function createDefaultConfig(repositories) {
  return {
    version: '1.0.0',
    modes: ['Claude', 'IDE', 'Claude + IDE', 'PowerShell'],
    claudeStartupModes: ['none', 'with startup check', 'with /commit'],
    ides: detectIDEs(),
    unmanagedPaths: [], // Repos excluded from main menu
    entries: [
      { type: 'workspace', path: '.', name: 'Root (workspace)', ide: 'WebStorm' },
      ...repositories.map(r => ({
        type: 'repo',
        path: r.path,
        name: r.path,
        ide: 'WebStorm',
      })),
    ],
  };
}

// ============================================================================
// IDE Detection
// ============================================================================

function detectIDEs() {
  const ides = [];
  const jetBrainsPath = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\JetBrains';

  if (fs.existsSync(jetBrainsPath)) {
    try {
      const files = fs.readdirSync(jetBrainsPath);

      // WebStorm
      const webStorm = files.find(f => f.toLowerCase().includes('webstorm') && f.endsWith('.lnk'));
      if (webStorm) {
        ides.push({ name: 'WebStorm', shortcut: path.join(jetBrainsPath, webStorm) });
      }

      // IntelliJ
      const intellij = files.find(f => f.toLowerCase().includes('intellij') && f.endsWith('.lnk'));
      if (intellij) {
        ides.push({ name: 'IntelliJ', shortcut: path.join(jetBrainsPath, intellij) });
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // VS Code
  const vsCodePath = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Visual Studio Code';
  if (fs.existsSync(vsCodePath)) {
    try {
      const files = fs.readdirSync(vsCodePath);
      const vscode = files.find(f => f.toLowerCase().includes('visual studio code') && f.endsWith('.lnk'));
      if (vscode) {
        ides.push({ name: 'VSCode', shortcut: path.join(vsCodePath, vscode) });
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return ides;
}

// ============================================================================
// Git Operations
// ============================================================================

function getGitStats(repoPath) {
  try {
    const fullPath = path.join(WORKSPACE_ROOT, repoPath);
    if (!fs.existsSync(path.join(fullPath, '.git'))) {
      return null;
    }

    const result = execSync('git diff --shortstat', {
      cwd: fullPath,
      encoding: 'utf8',
      timeout: 5000,
    }).trim();

    if (!result) {
      // Check for staged changes
      const staged = execSync('git diff --cached --shortstat', {
        cwd: fullPath,
        encoding: 'utf8',
        timeout: 5000,
      }).trim();

      if (!staged) return null;
      return parseGitStats(staged);
    }

    return parseGitStats(result);
  } catch (e) {
    return null;
  }
}

function parseGitStats(output) {
  // Example: "3 files changed, 15 insertions(+), 7 deletions(-)"
  const filesMatch = output.match(/(\d+) files? changed/);
  const addedMatch = output.match(/(\d+) insertions?\(\+\)/);
  const removedMatch = output.match(/(\d+) deletions?\(-\)/);

  return {
    files: filesMatch ? parseInt(filesMatch[1]) : 0,
    added: addedMatch ? parseInt(addedMatch[1]) : 0,
    removed: removedMatch ? parseInt(removedMatch[1]) : 0,
  };
}

async function scanAllDiffs(entries) {
  const diffs = {};
  for (const entry of entries) {
    const stats = getGitStats(entry.path);
    if (stats) {
      diffs[entry.path] = stats;
    }
  }
  return diffs;
}

// ============================================================================
// Managed Repos Logic
// ============================================================================

/**
 * Get all managed repos (all repos minus unmanaged)
 */
function getManagedRepos(allRepos, unmanagedPaths) {
  return allRepos.filter(r => !unmanagedPaths.includes(r.path));
}

/**
 * Get managed repos that are NOT in entries (shown as "Other managed")
 */
function getOtherManagedRepos(managedRepos, entries) {
  const entryPaths = entries.map(e => e.path);
  return managedRepos.filter(r => !entryPaths.includes(r.path));
}

/**
 * Create a virtual entry for "Other managed" repos submenu
 */
function createOtherManagedEntry(otherCount) {
  return {
    type: 'other-managed',
    path: '__other_managed__',
    name: `(Other managed - ${otherCount} repos)`,
    ide: null,
  };
}

// ============================================================================
// Launcher Logic
// ============================================================================

function launch(entry, mode, claudeStartupMode, ides) {
  const fullPath = path.join(WORKSPACE_ROOT, entry.path);

  if (!fs.existsSync(fullPath)) {
    console.log(`\n${ANSI.red}Error: Path not found: ${fullPath}${ANSI.reset}`);
    return false;
  }

  // Find IDE shortcut
  const ide = ides.find(i => i.name === entry.ide) || ides[0];

  if (mode === 'IDE' || mode === 'Claude + IDE') {
    if (!ide) {
      console.log(`\n${ANSI.red}Error: No IDE configured${ANSI.reset}`);
      return false;
    }

    console.log(`\n${ANSI.magenta}Opening ${entry.name} in ${ide.name}...${ANSI.reset}`);
    spawn('cmd', ['/c', 'start', '', ide.shortcut, fullPath], { detached: true, stdio: 'ignore' });

    if (mode === 'IDE') {
      return true;
    }
  }

  if (mode === 'PowerShell') {
    console.log(`\n${ANSI.blue}Opening PowerShell in ${entry.name}...${ANSI.reset}`);
    spawn('powershell', ['-NoExit', '-Command', `Set-Location '${fullPath}'`], { detached: true, stdio: 'ignore' });
    return true;
  }

  // Claude mode
  const claudeArgs = [];
  let msg = 'Running Claude';

  if (claudeStartupMode === 'with startup check') {
    claudeArgs.push('/startup_check');
    msg = 'Running Claude with /startup_check';
  } else if (claudeStartupMode === 'with /commit') {
    claudeArgs.push('/commit');
    msg = 'Running Claude with /commit';
  }

  console.log(`\n${ANSI.green}${msg}...${ANSI.reset}`);
  process.chdir(fullPath);

  // Execute claude (replace current process)
  const claude = spawn('claude', claudeArgs, { stdio: 'inherit', shell: true });
  claude.on('exit', code => process.exit(code));
  return true;
}

// ============================================================================
// UI Rendering
// ============================================================================

function formatStats(stats) {
  if (!stats) return '';
  return `${ANSI.green}+${stats.added}${ANSI.reset}/${ANSI.yellow}-${stats.removed}${ANSI.reset} (${stats.files})`;
}

function render(state) {
  // Dispatch to appropriate render based on mode
  if (state.managementMode) {
    renderManagementMode(state);
  } else if (state.otherManagedMode) {
    renderOtherManagedMode(state);
  } else {
    renderMainMenu(state);
  }
}

function renderMainMenu(state) {
  const { displayEntries, selectedIndex, mode, claudeStartupMode, modes, claudeStartupModes, diffs, scanning, ides } = state;

  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.cyan}Select a repository:${ANSI.reset}`);
  lines.push(`${ANSI.dim}${'='.repeat(60)}${ANSI.reset}`);

  // Entry list
  displayEntries.forEach((entry, i) => {
    const isSelected = i === selectedIndex;
    const prefix = isSelected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';
    const num = `${i + 1}.`;

    // Special styling for "Other managed" entry
    const isOtherManaged = entry.type === 'other-managed';
    let name;
    if (isOtherManaged) {
      name = isSelected
        ? `${ANSI.bold}${ANSI.yellow}${entry.name}${ANSI.reset}`
        : `${ANSI.yellow}${entry.name}${ANSI.reset}`;
    } else {
      name = isSelected
        ? `${ANSI.bold}${ANSI.white}${entry.name}${ANSI.reset}`
        : entry.name;
    }

    // Stats (not for "Other managed")
    const stats = !isOtherManaged && diffs[entry.path] ? formatStats(diffs[entry.path]) : '';
    const padding = ' '.repeat(Math.max(0, 40 - entry.name.length));

    // IDE suffix for IDE modes (not for "Other managed")
    let suffix = '';
    if (!isOtherManaged) {
      if (mode === 'IDE' || mode === 'Claude + IDE') {
        const ideName = entry.ide || 'WebStorm';
        suffix = `${ANSI.dim} (${ideName})${ANSI.reset}`;
      } else if (mode === 'PowerShell') {
        suffix = `${ANSI.dim} (PowerShell)${ANSI.reset}`;
      }
    }

    lines.push(`${prefix} ${num} ${name}${suffix}${padding}${stats}`);
  });

  lines.push(`${ANSI.dim}${'='.repeat(60)}${ANSI.reset}`);

  // Mode indicator
  const modeColors = {
    'Claude': ANSI.green,
    'IDE': ANSI.magenta,
    'Claude + IDE': ANSI.cyan,
    'PowerShell': ANSI.blue,
  };

  const modeStr = modes.map(m =>
    m === mode
      ? `${modeColors[m]}${ANSI.bold}[${m}]${ANSI.reset}`
      : `${ANSI.dim}[${m}]${ANSI.reset}`
  ).join(' ');

  // Claude startup mode (only show for Claude modes)
  let startupStr = '';
  if (mode === 'Claude' || mode === 'Claude + IDE') {
    startupStr = ` ${ANSI.gray}startup:${ANSI.reset} ${ANSI.yellow}[${claudeStartupMode}]${ANSI.reset}`;
  }

  lines.push(`\nMode: ${modeStr}${startupStr}`);

  // IDE status
  if (ides.length > 0) {
    const ideNames = ides.map(i => i.name).join(', ');
    lines.push(`${ANSI.dim}IDEs detected: ${ideNames}${ANSI.reset}`);
  } else {
    lines.push(`${ANSI.dim}No IDEs detected${ANSI.reset}`);
  }

  // Help
  lines.push('');
  lines.push(`${ANSI.dim}Tab/w: mode | c: startup mode | Up/Down: nav | Enter: select | 1-${displayEntries.length}: direct | q: quit${ANSI.reset}`);
  lines.push(`${ANSI.dim}d: scan git diff | m: manage repos${ANSI.reset}`);

  // Status
  if (scanning) {
    lines.push(`\n${ANSI.yellow}Scanning for changes...${ANSI.reset}`);
  }

  // Clear and print
  process.stdout.write(ANSI.clear);
  console.log(lines.join('\n'));
}

function renderOtherManagedMode(state) {
  const { otherManagedRepos, otherManagedSelectedIndex, mode, diffs, ides } = state;

  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.yellow}Other Managed Repositories:${ANSI.reset}`);
  lines.push(`${ANSI.dim}${'='.repeat(60)}${ANSI.reset}`);

  otherManagedRepos.forEach((repo, i) => {
    const isSelected = i === otherManagedSelectedIndex;
    const prefix = isSelected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';
    const num = `${i + 1}.`;
    const name = isSelected
      ? `${ANSI.bold}${ANSI.white}${repo.path}${ANSI.reset}`
      : repo.path;

    // Stats
    const stats = diffs[repo.path] ? formatStats(diffs[repo.path]) : '';
    const padding = ' '.repeat(Math.max(0, 40 - repo.path.length));

    lines.push(`${prefix} ${num} ${name}${padding}${stats}`);
  });

  lines.push(`${ANSI.dim}${'='.repeat(60)}${ANSI.reset}`);
  lines.push('');
  lines.push(`${ANSI.dim}Enter: select | Up/Down: navigate | Esc/q: back${ANSI.reset}`);

  process.stdout.write(ANSI.clear);
  console.log(lines.join('\n'));
}

function renderManagementMode(state) {
  const { allRepos, unmanagedPaths, managementSelectedIndex } = state;

  const lines = [];

  lines.push(`${ANSI.bold}${ANSI.magenta}Manage Repositories:${ANSI.reset}`);
  lines.push(`${ANSI.dim}${'='.repeat(60)}${ANSI.reset}`);

  allRepos.forEach((repo, i) => {
    const isSelected = i === managementSelectedIndex;
    const isManaged = !unmanagedPaths.includes(repo.path);
    const checkbox = isManaged ? `${ANSI.green}[x]${ANSI.reset}` : `${ANSI.gray}[ ]${ANSI.reset}`;
    const prefix = isSelected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';
    const num = `${i + 1}.`;

    let name = repo.path;
    if (isSelected) {
      name = `${ANSI.bold}${ANSI.white}${repo.path}${ANSI.reset}`;
    } else if (!isManaged) {
      name = `${ANSI.gray}${repo.path}${ANSI.reset}`;
    }

    const hiddenLabel = !isManaged ? `${ANSI.dim} (hidden)${ANSI.reset}` : '';

    lines.push(`${prefix} ${checkbox} ${num} ${name}${hiddenLabel}`);
  });

  lines.push(`${ANSI.dim}${'='.repeat(60)}${ANSI.reset}`);
  lines.push('');
  lines.push(`${ANSI.dim}Space: toggle | Enter: save & exit | Esc/q: cancel${ANSI.reset}`);

  process.stdout.write(ANSI.clear);
  console.log(lines.join('\n'));
}

// ============================================================================
// Main Application
// ============================================================================

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Handle help
  if (args.help) {
    console.log(`
Claude Root Launcher

Usage: node launcher.js --workspace-root <path> --state-dir <path> [options]

Required:
  --workspace-root  Workspace root directory (where repos live)
  --state-dir       Plugin state directory (for config files)

Options:
  --setup     Run interactive setup wizard
  --config    Show current configuration
  --help      Show this help message

Note: Use the wrapper scripts (launcher.ps1 / launcher.sh) which
automatically provide the correct paths from your workspace root.
`);
    return;
  }

  // Validate required args
  if (!args.workspaceRoot || !args.stateDir) {
    console.error(`${ANSI.red}Error: --workspace-root and --state-dir are required.${ANSI.reset}`);
    console.error(`${ANSI.yellow}Use the wrapper script: ./launcher.ps1 (Windows) or ./launcher.sh (Unix)${ANSI.reset}`);
    console.error(`Or run with --help for usage information.`);
    process.exit(1);
  }

  // Set global paths
  WORKSPACE_ROOT = args.workspaceRoot;
  STATE_DIR = args.stateDir;

  // Ensure state directory exists
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  if (args.config) {
    const { config } = loadConfig();
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (args.setup) {
    await runSetup();
    return;
  }

  // Load config
  const { config, repos: reposData, diffs: savedDiffs } = loadConfig();

  if (!config.entries || config.entries.length === 0) {
    console.log(`${ANSI.yellow}No entries configured. Run with --setup to configure.${ANSI.reset}`);
    return;
  }

  // Compute managed/other repos
  const allRepos = reposData.repositories || [];
  const managedRepos = getManagedRepos(allRepos, config.unmanagedPaths || []);
  const otherManagedRepos = getOtherManagedRepos(managedRepos, config.entries);

  // Build display entries (entries + "Other managed" if any)
  const displayEntries = [...config.entries];
  if (otherManagedRepos.length > 0) {
    displayEntries.push(createOtherManagedEntry(otherManagedRepos.length));
  }

  // App state
  const state = {
    entries: config.entries,           // Curated entries from config
    displayEntries: displayEntries,    // What's shown in main menu
    allRepos: allRepos,                // All repos from repos.json
    unmanagedPaths: config.unmanagedPaths || [],
    otherManagedRepos: otherManagedRepos,
    selectedIndex: 0,
    mode: config.modes[0],
    claudeStartupMode: config.claudeStartupModes[0],
    modes: config.modes,
    claudeStartupModes: config.claudeStartupModes,
    ides: config.ides || [],
    diffs: savedDiffs || {},
    scanning: false,
    // Management mode state
    managementMode: false,
    managementSelectedIndex: 0,
    // Other managed submenu state
    otherManagedMode: false,
    otherManagedSelectedIndex: 0,
  };

  // Set up input
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  // Initial render
  render(state);

  // Helper to refresh display entries and other managed repos
  function refreshDisplayEntries() {
    const managedRepos = getManagedRepos(state.allRepos, state.unmanagedPaths);
    state.otherManagedRepos = getOtherManagedRepos(managedRepos, state.entries);

    // Rebuild display entries
    state.displayEntries = [...state.entries];
    if (state.otherManagedRepos.length > 0) {
      state.displayEntries.push(createOtherManagedEntry(state.otherManagedRepos.length));
    }

    // Clamp selection index
    if (state.selectedIndex >= state.displayEntries.length) {
      state.selectedIndex = Math.max(0, state.displayEntries.length - 1);
    }
  }

  // Helper to save config
  function saveConfig() {
    const configPaths = getConfigPaths();
    const existingConfig = loadJson(configPaths.config, {});
    existingConfig.unmanagedPaths = state.unmanagedPaths;
    existingConfig.entries = state.entries;
    saveJson(configPaths.config, existingConfig);
  }

  // Handle keypresses
  process.stdin.on('keypress', async (str, key) => {
    if (!key) return;

    // Ctrl+C - always exit
    if (key.ctrl && key.name === 'c') {
      console.log('\nBye!');
      process.exit(0);
    }

    // Management mode keys
    if (state.managementMode) {
      switch (key.name) {
        case 'up':
          state.managementSelectedIndex = Math.max(0, state.managementSelectedIndex - 1);
          render(state);
          break;

        case 'down':
          state.managementSelectedIndex = Math.min(state.allRepos.length - 1, state.managementSelectedIndex + 1);
          render(state);
          break;

        case 'space':
          // Toggle managed/unmanaged for selected repo
          const repo = state.allRepos[state.managementSelectedIndex];
          if (repo) {
            const idx = state.unmanagedPaths.indexOf(repo.path);
            if (idx === -1) {
              // Currently managed -> make unmanaged
              state.unmanagedPaths.push(repo.path);
              // Also remove from entries if present
              state.entries = state.entries.filter(e => e.path !== repo.path);
            } else {
              // Currently unmanaged -> make managed
              state.unmanagedPaths.splice(idx, 1);
            }
            refreshDisplayEntries();
          }
          render(state);
          break;

        case 'return':
          // Save and exit management mode
          saveConfig();
          state.managementMode = false;
          state.managementSelectedIndex = 0;
          render(state);
          break;

        case 'escape':
        case 'q':
          // Exit without saving (revert changes)
          // Reload config to discard changes
          const { config: reloadedConfig } = loadConfig();
          state.unmanagedPaths = reloadedConfig.unmanagedPaths || [];
          state.entries = reloadedConfig.entries || [];
          refreshDisplayEntries();
          state.managementMode = false;
          state.managementSelectedIndex = 0;
          render(state);
          break;

        default:
          // Number keys
          const num = parseInt(str, 10);
          if (num >= 1 && num <= state.allRepos.length) {
            state.managementSelectedIndex = num - 1;
            render(state);
          }
      }
      return;
    }

    // Other managed submenu keys
    if (state.otherManagedMode) {
      switch (key.name) {
        case 'up':
          state.otherManagedSelectedIndex = Math.max(0, state.otherManagedSelectedIndex - 1);
          render(state);
          break;

        case 'down':
          state.otherManagedSelectedIndex = Math.min(state.otherManagedRepos.length - 1, state.otherManagedSelectedIndex + 1);
          render(state);
          break;

        case 'return':
          // Launch selected repo with default IDE
          const selectedRepo = state.otherManagedRepos[state.otherManagedSelectedIndex];
          if (selectedRepo) {
            const entry = {
              type: 'repo',
              path: selectedRepo.path,
              name: selectedRepo.path,
              ide: state.ides[0]?.name || 'WebStorm',
            };
            if (process.stdin.isTTY) process.stdin.setRawMode(false);
            launch(entry, state.mode, state.claudeStartupMode, state.ides);
          }
          break;

        case 'escape':
        case 'q':
          state.otherManagedMode = false;
          state.otherManagedSelectedIndex = 0;
          render(state);
          break;

        default:
          // Number keys
          const num = parseInt(str, 10);
          if (num >= 1 && num <= state.otherManagedRepos.length) {
            state.otherManagedSelectedIndex = num - 1;
            render(state);
          }
      }
      return;
    }

    // Main menu keys
    switch (key.name) {
      case 'up':
        state.selectedIndex = Math.max(0, state.selectedIndex - 1);
        render(state);
        break;

      case 'down':
        state.selectedIndex = Math.min(state.displayEntries.length - 1, state.selectedIndex + 1);
        render(state);
        break;

      case 'return':
        const selectedEntry = state.displayEntries[state.selectedIndex];
        if (selectedEntry.type === 'other-managed') {
          // Enter other managed submenu
          state.otherManagedMode = true;
          state.otherManagedSelectedIndex = 0;
          render(state);
        } else {
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          launch(selectedEntry, state.mode, state.claudeStartupMode, state.ides);
        }
        break;

      case 'tab':
      case 'w':
        const modeIdx = state.modes.indexOf(state.mode);
        state.mode = state.modes[(modeIdx + 1) % state.modes.length];
        render(state);
        break;

      case 'c':
        const startupIdx = state.claudeStartupModes.indexOf(state.claudeStartupMode);
        state.claudeStartupMode = state.claudeStartupModes[(startupIdx + 1) % state.claudeStartupModes.length];
        render(state);
        break;

      case 'q':
        console.log('\nBye!');
        process.exit(0);
        break;

      case 'd':
        state.scanning = true;
        render(state);
        state.diffs = await scanAllDiffs(state.displayEntries.filter(e => e.type !== 'other-managed'));
        // Save diffs
        const paths = getConfigPaths();
        saveJson(paths.diffs, state.diffs);
        state.scanning = false;
        render(state);
        break;

      case 'm':
        // Enter management mode
        if (state.allRepos.length > 0) {
          state.managementMode = true;
          state.managementSelectedIndex = 0;
          render(state);
        } else {
          console.log(`\n${ANSI.yellow}No repos found. Run scan-for-repos first.${ANSI.reset}`);
          setTimeout(() => render(state), 1500);
        }
        break;

      default:
        // Number keys
        const num = parseInt(str, 10);
        if (num >= 1 && num <= state.displayEntries.length) {
          state.selectedIndex = num - 1;
          render(state);
        }
    }
  });

  // Handle resize
  process.stdout.on('resize', () => render(state));
}

// ============================================================================
// Setup Wizard
// ============================================================================

async function runSetup() {
  console.log(`${ANSI.bold}${ANSI.cyan}Claude Root Launcher Setup${ANSI.reset}\n`);

  // Detect IDEs
  console.log('Detecting IDEs...');
  const ides = detectIDEs();
  if (ides.length > 0) {
    console.log(`${ANSI.green}Found:${ANSI.reset}`);
    ides.forEach(ide => console.log(`  - ${ide.name}`));
  } else {
    console.log(`${ANSI.yellow}No IDEs detected${ANSI.reset}`);
  }

  // Load or create config
  const paths = getConfigPaths();
  let config = loadJson(paths.config);

  if (config) {
    console.log(`\n${ANSI.yellow}Existing config found at:${ANSI.reset}`);
    console.log(`  ${paths.config}`);
    console.log(`  ${config.entries?.length || 0} entries configured`);
  } else {
    console.log(`\n${ANSI.cyan}Creating new config...${ANSI.reset}`);

    // Load repos from scan
    const reposData = loadJson(paths.repos, { repositories: [] });

    config = createDefaultConfig(reposData.repositories);
    config.ides = ides;

    saveJson(paths.config, config);
    console.log(`${ANSI.green}Config saved to:${ANSI.reset} ${paths.config}`);
  }

  console.log(`\n${ANSI.green}Setup complete!${ANSI.reset}`);
  console.log(`Run ${ANSI.cyan}node launcher.js${ANSI.reset} to start.`);
}

// Run
main().catch(err => {
  console.error(`${ANSI.red}Error: ${err.message}${ANSI.reset}`);
  process.exit(1);
});
