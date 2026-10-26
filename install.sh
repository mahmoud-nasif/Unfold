#!/bin/sh
# Install the Unfold skill into every coding agent found on this machine.
#
#   curl -fsSL https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/install.sh | sh
#   curl -fsSL .../install.sh | sh -s -- --agent claude-code --dry-run
#   sh install.sh --from .              # from a local checkout (or a skill folder, or unfold.zip)
#
# Options:
#   --agent NAME    install for this agent only; repeat or comma-separate (default: every agent detected)
#   --all           install for every known agent, detected or not
#   --project       install into the current directory's project-level skills folders instead of $HOME
#   --from PATH     use a local checkout, skill folder or unfold.zip instead of downloading
#   --version TAG   download this release tag instead of the latest release
#   --uninstall     remove the skill from the selected agents
#   --dry-run       print what would happen and change nothing
#   --list          list known agents and whether they were detected
#
# Re-running is safe: an existing copy of Unfold is replaced, and a folder named
# "unfold" that is not this skill is never touched.
#
# Skills folders, each checked against the agent's own documentation (2026-10):
#   claude-code  ~/.claude/skills          .claude/skills   https://code.claude.com/docs/en/skills
#   cline        ~/.cline/skills           .cline/skills    https://docs.cline.bot/features/skills
#   kiro         ~/.kiro/skills            .kiro/skills     https://kiro.dev/docs/skills/
#   antigravity  ~/.gemini/config/skills   .agents/skills   https://antigravity.google/docs/skills
#   The shared folder ~/.agents/skills (project: .agents/skills) is read by:
#   codex        https://learn.chatgpt.com/docs/build-skills
#   cursor       https://cursor.com/docs/context/skills
#   opencode     https://opencode.ai/docs/skills/
#   gemini-cli   https://geminicli.com/docs/cli/skills/
#   github-copilot  https://code.visualstudio.com/docs/copilot/customization/agent-skills
#                   https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills
#   windsurf     https://docs.devin.ai/desktop/cascade/skills
#   goose        https://goose-docs.ai/docs/guides/context-engineering/using-skills
#   roo          https://roocodeinc.github.io/Roo-Code/features/skills
#   amp          https://ampcode.com/docs/customize/skills
#   kilo         https://kilo.ai/docs/agent-behavior/skills
#   junie        https://junie.jetbrains.com/docs/agent-skills.html
#   droid        https://docs.factory.com/cli/configuration/skills
#   qwen-code    https://qwenlm.github.io/qwen-code-docs/en/users/features/skills/
#   zed          https://zed.dev/docs/ai/skills
#   warp         https://docs.warp.dev/agent-platform/warp-agents/capabilities-overview/skills
# Detection looks for each agent's usual config folder; that is a convention, not documented API.
# Latest-release download URL: https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases
set -eu

REPO="mahmoud-nasif/Unfold"
SKILL="unfold"
KNOWN="claude-code codex cursor opencode gemini-cli github-copilot windsurf goose roo amp kilo junie droid qwen-code zed warp cline kiro antigravity"

FROM=""
AGENTS=""
ALL=0
PROJECT=0
DRY=0
UNINSTALL=0
LIST=0
VERSION="latest"
TMP=""

say() { printf '%s\n' "$*"; }
die() { printf 'install.sh: %s\n' "$*" >&2; exit 1; }
cleanup() { if [ -n "$TMP" ] && [ -d "$TMP" ]; then rm -rf "$TMP"; fi; }
trap cleanup EXIT INT TERM

usage() {
  cat <<'EOF_USAGE'
Usage: install.sh [--agent NAME]... [--all] [--project] [--from PATH] [--version TAG]
                  [--uninstall] [--dry-run] [--list]

  --agent NAME    install for this agent only; repeat or comma-separate (default: every agent detected)
  --all           install for every known agent, detected or not
  --project       install into the current directory's project-level skills folders instead of $HOME
  --from PATH     use a local checkout, skill folder or unfold.zip instead of downloading
  --version TAG   download this release tag instead of the latest release
  --uninstall     remove the skill from the selected agents
  --dry-run       print what would happen and change nothing
  --list          list known agents, whether each was detected, and its skills folder
EOF_USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --agent) [ $# -ge 2 ] || die "--agent needs a name"; AGENTS="$AGENTS $(printf '%s' "$2" | tr ',' ' ')"; shift 2 ;;
    --agent=*) AGENTS="$AGENTS $(printf '%s' "${1#*=}" | tr ',' ' ')"; shift ;;
    --all) ALL=1; shift ;;
    --project) PROJECT=1; shift ;;
    --from) [ $# -ge 2 ] || die "--from needs a path"; FROM="$2"; shift 2 ;;
    --from=*) FROM="${1#*=}"; shift ;;
    --version) [ $# -ge 2 ] || die "--version needs a tag"; VERSION="$2"; shift 2 ;;
    --version=*) VERSION="${1#*=}"; shift ;;
    --uninstall) UNINSTALL=1; shift ;;
    --dry-run|-n) DRY=1; shift ;;
    --list) LIST=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
done

[ -n "${HOME:-}" ] || die "HOME is not set"

# agent -> skills-folder group
group_of() {
  case "$1" in
    claude-code) echo claude ;;
    cline) echo cline ;;
    kiro) echo kiro ;;
    antigravity) echo antigravity ;;
    codex|cursor|opencode|gemini-cli|github-copilot|windsurf|goose|roo|amp|kilo|junie|droid|qwen-code|zed|warp|universal) echo agents ;;
    *) echo "" ;;
  esac
}

# group -> folder that holds skills
dir_of() {
  if [ "$PROJECT" -eq 1 ]; then
    case "$1" in
      claude) echo "$PWD/.claude/skills" ;;
      cline) echo "$PWD/.cline/skills" ;;
      kiro) echo "$PWD/.kiro/skills" ;;
      agents|antigravity) echo "$PWD/.agents/skills" ;;
    esac
  else
    case "$1" in
      claude) echo "$HOME/.claude/skills" ;;
      cline) echo "$HOME/.cline/skills" ;;
      kiro) echo "$HOME/.kiro/skills" ;;
      antigravity) echo "$HOME/.gemini/config/skills" ;;
      agents) echo "$HOME/.agents/skills" ;;
    esac
  fi
}

detected() {
  c="$HOME/.config"
  case "$1" in
    claude-code) [ -d "$HOME/.claude" ] ;;
    codex) [ -d "$HOME/.codex" ] ;;
    cursor) [ -d "$HOME/.cursor" ] ;;
    opencode) [ -d "$c/opencode" ] ;;
    gemini-cli) [ -d "$HOME/.gemini" ] ;;
    github-copilot) [ -d "$HOME/.copilot" ] ;;
    windsurf) [ -d "$HOME/.codeium/windsurf" ] ;;
    goose) [ -d "$c/goose" ] ;;
    roo) [ -d "$HOME/.roo" ] ;;
    amp) [ -d "$c/amp" ] ;;
    kilo) [ -d "$HOME/.kilo" ] || [ -d "$c/kilo" ] ;;
    junie) [ -d "$HOME/.junie" ] ;;
    droid) [ -d "$HOME/.factory" ] ;;
    qwen-code) [ -d "$HOME/.qwen" ] ;;
    zed) [ -d "$c/zed" ] ;;
    warp) [ -d "$HOME/.warp" ] ;;
    cline) [ -d "$HOME/.cline" ] ;;
    kiro) [ -d "$HOME/.kiro" ] ;;
    antigravity) [ -d "$HOME/.gemini/antigravity" ] || [ -d "$HOME/.gemini/config" ] ;;
    *) return 1 ;;
  esac
}

if [ "$LIST" -eq 1 ]; then
  for a in $KNOWN; do
    if detected "$a"; then s="detected"; else s="-"; fi
    printf '  %-15s %-9s %s\n' "$a" "$s" "$(dir_of "$(group_of "$a")")"
  done
  exit 0
fi

# Choose agents.
if [ "$ALL" -eq 1 ]; then
  AGENTS="$KNOWN"
elif [ -z "$(printf '%s' "$AGENTS" | tr -d ' ')" ]; then
  for a in $KNOWN; do
    if detected "$a"; then AGENTS="$AGENTS $a"; fi
  done
  if [ -z "$(printf '%s' "$AGENTS" | tr -d ' ')" ]; then
    say "No coding agent detected; installing into the shared folder ~/.agents/skills (or pass --agent NAME)."
    AGENTS="universal"
  fi
fi

TGROUPS=""
for a in $AGENTS; do
  g="$(group_of "$a")"
  [ -n "$g" ] || die "unknown agent '$a' (known: $KNOWN universal)"
  case " $TGROUPS " in *" $g "*) ;; *) TGROUPS="$TGROUPS $g" ;; esac
done
DIRS=""
for g in $TGROUPS; do
  d="$(dir_of "$g")"
  case " $DIRS " in *" $d "*) ;; *) DIRS="$DIRS $d" ;; esac
done

is_ours() { [ -f "$1/SKILL.md" ] && grep -q "^name: $SKILL\$" "$1/SKILL.md"; }

run() {
  if [ "$DRY" -eq 1 ]; then say "  would: $*"; else "$@"; fi
}

say "Agents: $(printf '%s' "$AGENTS" | sed 's/^ *//')"

if [ "$UNINSTALL" -eq 1 ]; then
  for d in $DIRS; do
    t="$d/$SKILL"
    if [ ! -e "$t" ]; then say "not installed: $t"; continue; fi
    is_ours "$t" || die "$t exists but is not the Unfold skill; leaving it alone"
    run rm -rf "$t"
    say "removed $t"
  done
  exit 0
fi

# Resolve the skill folder to copy.
fetch() {
  if command -v curl >/dev/null 2>&1; then curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then wget -q "$1" -O "$2"
  else die "need curl or wget to download $1 (or use --from PATH)"; fi
}
unpack() {
  if command -v unzip >/dev/null 2>&1; then unzip -q "$1" -d "$2"
  elif command -v python3 >/dev/null 2>&1; then python3 -m zipfile -e "$1" "$2"
  else die "need unzip or python3 to unpack $1"; fi
}

SRC=""
if [ -n "$FROM" ]; then
  if [ -f "$FROM/SKILL.md" ]; then SRC="$FROM"
  elif [ -f "$FROM/skill/$SKILL/SKILL.md" ]; then SRC="$FROM/skill/$SKILL"
  elif [ -f "$FROM" ]; then
    TMP="$(mktemp -d)"; unpack "$FROM" "$TMP"; SRC="$TMP/$SKILL"
  else die "--from $FROM: no SKILL.md, skill/$SKILL/SKILL.md or zip file there"; fi
else
  if [ "$VERSION" = "latest" ]; then URL="https://github.com/$REPO/releases/latest/download/$SKILL.zip"
  else URL="https://github.com/$REPO/releases/download/$VERSION/$SKILL.zip"; fi
  if [ "$DRY" -eq 1 ]; then
    say "  would: download $URL"
  else
    TMP="$(mktemp -d)"
    say "Downloading $URL"
    fetch "$URL" "$TMP/$SKILL.zip"
    unpack "$TMP/$SKILL.zip" "$TMP/x"
    SRC="$TMP/x/$SKILL"
  fi
fi
if [ -n "$SRC" ]; then
  is_ours "$SRC" || die "$SRC does not contain the Unfold SKILL.md"
fi

for d in $DIRS; do
  t="$d/$SKILL"
  if [ -e "$t" ] && ! is_ours "$t"; then
    die "$t exists but is not the Unfold skill; move it away first"
  fi
  if [ "$DRY" -eq 1 ]; then
    say "  would: install ${SRC:-$SKILL} -> $t"
    continue
  fi
  mkdir -p "$d"
  stage="$d/.$SKILL.installing.$$"
  rm -rf "$stage"
  cp -R "$SRC" "$stage"
  # Behaviour tests and caches are not part of the installed skill.
  rm -rf "$stage/evals"
  find "$stage" -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
  rm -rf "$t"
  mv "$stage" "$t"
  say "installed $t"
done

if [ "$DRY" -eq 0 ]; then
  say ""
  say "Done. Open your agent in a repository and ask: \"map this repo\"."
fi
