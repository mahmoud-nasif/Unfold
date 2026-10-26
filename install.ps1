<#
.SYNOPSIS
  Install the Unfold skill into every coding agent found on this machine (Windows PowerShell 5.1+ or PowerShell 7).

.DESCRIPTION
  irm https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/install.ps1 | iex
  & ([scriptblock]::Create((irm https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/install.ps1))) -Agent claude-code -DryRun
  .\install.ps1 -From .            # from a local checkout, a skill folder or unfold.zip

  Same behaviour and agent list as install.sh; see the comments there for the documentation
  source of every skills folder. Re-running is safe: an existing copy of Unfold is replaced, and
  a folder named "unfold" that is not this skill is never touched.

.PARAMETER Agent      Install for these agents only (default: every agent detected). Comma-separate or repeat.
.PARAMETER All        Install for every known agent, detected or not.
.PARAMETER Project    Install into the current directory's project-level skills folders instead of the user profile.
.PARAMETER From       Use a local checkout, skill folder or unfold.zip instead of downloading.
.PARAMETER Version    Download this release tag instead of the latest release.
.PARAMETER Uninstall  Remove the skill from the selected agents.
.PARAMETER DryRun     Print what would happen and change nothing.
.PARAMETER List       List known agents, whether each was detected, and its skills folder.
#>
param(
  [string[]]$Agent = @(),
  [switch]$All,
  [switch]$Project,
  [string]$From = "",
  [string]$Version = "latest",
  [switch]$Uninstall,
  [switch]$DryRun,
  [switch]$List
)
$ErrorActionPreference = "Stop"
$Repo = "mahmoud-nasif/Unfold"
$Skill = "unfold"
$HomeDir = [Environment]::GetFolderPath("UserProfile")
$Cfg = Join-Path $HomeDir ".config"

# agent -> (group, detect folders). Skills folders follow each agent's docs (URLs in install.sh).
# Detection is a convention, not documented API; the AppData paths for goose and zed are unverified guesses.
$Known = [ordered]@{
  "claude-code"    = @("claude",      @(".claude"))
  "codex"          = @("agents",      @(".codex"))
  "cursor"         = @("agents",      @(".cursor"))
  "opencode"       = @("agents",      @(".config\opencode"))
  "gemini-cli"     = @("agents",      @(".gemini"))
  "github-copilot" = @("agents",      @(".copilot"))
  "windsurf"       = @("agents",      @(".codeium\windsurf"))
  "goose"          = @("agents",      @(".config\goose", "AppData\Roaming\Block\goose"))
  "roo"            = @("agents",      @(".roo"))
  "amp"            = @("agents",      @(".config\amp"))
  "kilo"           = @("agents",      @(".kilo", ".config\kilo"))
  "junie"          = @("agents",      @(".junie"))
  "droid"          = @("agents",      @(".factory"))
  "qwen-code"      = @("agents",      @(".qwen"))
  "zed"            = @("agents",      @("AppData\Roaming\Zed", ".config\zed"))
  "warp"           = @("agents",      @(".warp"))
  "cline"          = @("cline",       @(".cline"))
  "kiro"           = @("kiro",        @(".kiro"))
  "antigravity"    = @("antigravity", @(".gemini\antigravity", ".gemini\config"))
  "universal"      = @("agents",      @())
}

function Get-SkillsDir([string]$group) {
  if ($Project) {
    $base = (Get-Location).Path
    switch ($group) {
      "claude" { return Join-Path $base ".claude\skills" }
      "cline"  { return Join-Path $base ".cline\skills" }
      "kiro"   { return Join-Path $base ".kiro\skills" }
      default  { return Join-Path $base ".agents\skills" }
    }
  }
  switch ($group) {
    "claude"      { return Join-Path $HomeDir ".claude\skills" }
    "cline"       { return Join-Path $HomeDir ".cline\skills" }
    "kiro"        { return Join-Path $HomeDir ".kiro\skills" }
    "antigravity" { return Join-Path $HomeDir ".gemini\config\skills" }
    default       { return Join-Path $HomeDir ".agents\skills" }
  }
}

function Test-Detected([string]$name) {
  foreach ($rel in $Known[$name][1]) {
    if (Test-Path -LiteralPath (Join-Path $HomeDir $rel) -PathType Container) { return $true }
  }
  return $false
}

function Test-Ours([string]$dir) {
  $md = Join-Path $dir "SKILL.md"
  if (-not (Test-Path -LiteralPath $md -PathType Leaf)) { return $false }
  return [bool](Select-String -LiteralPath $md -Pattern "^name: $Skill$" -Quiet)
}

if ($List) {
  foreach ($name in $Known.Keys) {
    if ($name -eq "universal") { continue }
    $state = if (Test-Detected $name) { "detected" } else { "-" }
    "  {0,-15} {1,-9} {2}" -f $name, $state, (Get-SkillsDir $Known[$name][0])
  }
  return
}

$agents = @($Agent | ForEach-Object { $_ -split "," } | Where-Object { $_ })
if ($All) {
  $agents = @($Known.Keys | Where-Object { $_ -ne "universal" })
} elseif ($agents.Count -eq 0) {
  $agents = @($Known.Keys | Where-Object { $_ -ne "universal" -and (Test-Detected $_) })
  if ($agents.Count -eq 0) {
    Write-Host "No coding agent detected; installing into the shared folder ~\.agents\skills (or pass -Agent NAME)."
    $agents = @("universal")
  }
}
$dirs = New-Object System.Collections.Generic.List[string]
foreach ($a in $agents) {
  if (-not $Known.Contains($a)) { throw "unknown agent '$a' (known: $($Known.Keys -join ', '))" }
  $d = Get-SkillsDir $Known[$a][0]
  if (-not $dirs.Contains($d)) { $dirs.Add($d) }
}
Write-Host "Agents: $($agents -join ' ')"

if ($Uninstall) {
  foreach ($d in $dirs) {
    $t = Join-Path $d $Skill
    if (-not (Test-Path -LiteralPath $t)) { Write-Host "not installed: $t"; continue }
    if (-not (Test-Ours $t)) { throw "$t exists but is not the Unfold skill; leaving it alone" }
    if ($DryRun) { Write-Host "  would: remove $t" } else { Remove-Item -LiteralPath $t -Recurse -Force; Write-Host "removed $t" }
  }
  return
}

$tmp = $null
try {
  $src = $null
  if ($From) {
    if (Test-Path -LiteralPath (Join-Path $From "SKILL.md")) { $src = (Resolve-Path -LiteralPath $From).Path }
    elseif (Test-Path -LiteralPath (Join-Path $From "skill\$Skill\SKILL.md")) { $src = (Resolve-Path -LiteralPath (Join-Path $From "skill\$Skill")).Path }
    elseif (Test-Path -LiteralPath $From -PathType Leaf) {
      $tmp = Join-Path ([IO.Path]::GetTempPath()) ("unfold-" + [guid]::NewGuid())
      Expand-Archive -LiteralPath $From -DestinationPath $tmp
      $src = Join-Path $tmp $Skill
    } else { throw "-From ${From}: no SKILL.md, skill\$Skill\SKILL.md or zip file there" }
  } else {
    $url = if ($Version -eq "latest") { "https://github.com/$Repo/releases/latest/download/$Skill.zip" }
           else { "https://github.com/$Repo/releases/download/$Version/$Skill.zip" }
    if ($DryRun) {
      Write-Host "  would: download $url"
    } else {
      $tmp = Join-Path ([IO.Path]::GetTempPath()) ("unfold-" + [guid]::NewGuid())
      New-Item -ItemType Directory -Path $tmp | Out-Null
      $zip = Join-Path $tmp "$Skill.zip"
      Write-Host "Downloading $url"
      [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
      Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
      Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $tmp "x")
      $src = Join-Path $tmp "x\$Skill"
    }
  }
  if ($src -and -not (Test-Ours $src)) { throw "$src does not contain the Unfold SKILL.md" }

  foreach ($d in $dirs) {
    $t = Join-Path $d $Skill
    if ((Test-Path -LiteralPath $t) -and -not (Test-Ours $t)) { throw "$t exists but is not the Unfold skill; move it away first" }
    if ($DryRun) { Write-Host "  would: install $(if ($src) { $src } else { $Skill }) -> $t"; continue }
    New-Item -ItemType Directory -Force -Path $d | Out-Null
    $stage = Join-Path $d ".$Skill.installing.$PID"
    if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
    Copy-Item -LiteralPath $src -Destination $stage -Recurse
    # Behaviour tests and caches are not part of the installed skill.
    $evals = Join-Path $stage "evals"
    if (Test-Path -LiteralPath $evals) { Remove-Item -LiteralPath $evals -Recurse -Force }
    Get-ChildItem -LiteralPath $stage -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
    if (Test-Path -LiteralPath $t) { Remove-Item -LiteralPath $t -Recurse -Force }
    Move-Item -LiteralPath $stage -Destination $t
    Write-Host "installed $t"
  }
  if (-not $DryRun) { Write-Host ""; Write-Host 'Done. Open your agent in a repository and ask: "map this repo".' }
} finally {
  if ($tmp -and (Test-Path -LiteralPath $tmp)) { Remove-Item -LiteralPath $tmp -Recurse -Force }
}
