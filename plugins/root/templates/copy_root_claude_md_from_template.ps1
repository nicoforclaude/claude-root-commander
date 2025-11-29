# Copy root_claude.md template to CLAUDE.md
# This script processes INSTRUCTION lines and prompts for quasi-var values
# This script should be run from the workspace root (e.g., C:\KolyaRepositories)

# Template is in the same directory as this script
$scriptDir = $PSScriptRoot
$sourcePath = Join-Path $scriptDir "root_claude.md"

# Workspace root is passed as argument, or use current directory
if ($args.Count -gt 0) {
    $workspaceRoot = $args[0]
} else {
    $workspaceRoot = Get-Location
}

$destPath = Join-Path $workspaceRoot "CLAUDE.md"

if (-not (Test-Path $sourcePath)) {
    Write-Host "Error: Source file not found at $sourcePath" -ForegroundColor Red
    exit 1
}

# Read the template content
$content = Get-Content -Path $sourcePath -Raw

# Remove INSTRUCTION lines
$lines = $content -split "`r?`n"
$processedLines = @()

foreach ($line in $lines) {
    if ($line -match '///INSTRUCTION LINE') {
        # Skip this line - it's an instruction comment
        continue
    }
    $processedLines += $line
}

# Join lines back together
$processedContent = $processedLines -join "`r`n"

# Track quasi-vars that were set
$quasiVarsSet = @()

# Prompt for CLAUDE_MAIN_WORKSPACE_ROOT if it's empty
if ($processedContent -match "CLAUDE_MAIN_WORKSPACE_ROOT = ''") {
    Write-Host ""
    Write-Host "Quasi-variable needs to be filled:" -ForegroundColor Yellow
    Write-Host "CLAUDE_MAIN_WORKSPACE_ROOT = current workspace root path" -ForegroundColor Cyan
    Write-Host ""

    $defaultValue = $workspaceRoot
    $userInput = Read-Host "Enter value for CLAUDE_MAIN_WORKSPACE_ROOT (default: $defaultValue)"

    if ([string]::IsNullOrWhiteSpace($userInput)) {
        $userInput = $defaultValue
    }

    # Replace the empty value with user input
    $processedContent = $processedContent -replace "CLAUDE_MAIN_WORKSPACE_ROOT = ''", "CLAUDE_MAIN_WORKSPACE_ROOT = '$userInput'"

    $quasiVarsSet += @{Name = "CLAUDE_MAIN_WORKSPACE_ROOT"; Value = $userInput}
}

# Write the processed content to destination
$processedContent | Set-Content -Path $destPath -NoNewline

Write-Host ""
Write-Host "Successfully copied and processed template to CLAUDE.md" -ForegroundColor Green
Write-Host "Location: $destPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Quasi-variables set:" -ForegroundColor Cyan
foreach ($var in $quasiVarsSet) {
    Write-Host "  $($var.Name) = '$($var.Value)'" -ForegroundColor White
}

# Also show derived quasi-vars
Write-Host ""
Write-Host "Derived quasi-variables (automatically calculated):" -ForegroundColor Cyan
if ($quasiVarsSet.Count -gt 0) {
    $mainRoot = $quasiVarsSet[0].Value
    $pluginsRoot = "$mainRoot\.localData\claude-plugins"
    Write-Host "  CLAUDE_PLUGINS_ROOT = '$pluginsRoot'" -ForegroundColor White
}
