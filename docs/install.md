# Installing Unfold

Unfold is an [Agent Skill](https://agentskills.io): a folder with a `SKILL.md`. Pick one route.

**Any agent, one command.** The [skills CLI](https://github.com/vercel-labs/skills) asks which agents to install into (`-g` for all your projects, `-a NAME` to choose):

```bash
npx skills add mahmoud-nasif/Unfold
```

**Our installer** finds the agents on your machine and copies the skill into each one's skills folder. It is safe to re-run, and `--dry-run`, `--agent NAME`, `--project`, `--uninstall` and `--list` do what they say:

```bash
curl -fsSL https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/install.sh | sh
# Windows (PowerShell)
irm https://raw.githubusercontent.com/mahmoud-nasif/Unfold/main/install.ps1 | iex
```

| Agent | Install | Skills folder it lands in |
|---|---|---|
| **Claude Code** | `/plugin marketplace add mahmoud-nasif/Unfold`, then `/plugin install unfold@unfold`; or the installer | plugin cache, or `~/.claude/skills` ([docs](https://code.claude.com/docs/en/skills)) |
| **claude.ai / Claude Desktop** | Download [`unfold.zip`](https://github.com/mahmoud-nasif/Unfold/releases/latest/download/unfold.zip), then **Customize → Skills → + → Upload a skill**. Needs code execution enabled. | your account ([help](https://support.claude.com/en/articles/12512180-use-skills-in-claude)) |
| **Claude API** | Upload the zip through the Skills API (`/v1/skills`) and reference it in your request's container. | |
| **Codex CLI** | installer, `--agent codex` | `~/.agents/skills` ([docs](https://learn.chatgpt.com/docs/build-skills)) |
| **Cursor** | installer, `--agent cursor` | `~/.agents/skills` ([docs](https://cursor.com/docs/context/skills)) |
| **OpenCode** | installer, `--agent opencode` | `~/.agents/skills` ([docs](https://opencode.ai/docs/skills/)) |
| **Gemini CLI** | installer, `--agent gemini-cli` | `~/.agents/skills` ([docs](https://geminicli.com/docs/cli/skills/)) |
| **GitHub Copilot** (VS Code agent mode, Copilot CLI) | installer, `--agent github-copilot` | `~/.agents/skills` ([VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills), [CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills)) |
| **Windsurf** | installer, `--agent windsurf` | `~/.agents/skills` ([docs](https://docs.devin.ai/desktop/cascade/skills)) |
| **Goose** | installer, `--agent goose` | `~/.agents/skills` ([docs](https://goose-docs.ai/docs/guides/context-engineering/using-skills)) |
| **Roo Code** | installer, `--agent roo` | `~/.agents/skills` ([docs](https://roocodeinc.github.io/Roo-Code/features/skills)) |
| **Amp** | installer, `--agent amp` | `~/.agents/skills` ([docs](https://ampcode.com/docs/customize/skills)) |
| **Kilo Code, Junie, Factory Droid, Qwen Code, Zed, Warp** | installer, `--agent kilo` / `junie` / `droid` / `qwen-code` / `zed` / `warp` | `~/.agents/skills` (each agent's own skills docs; links in `install.sh`) |
| **Cline** | installer, `--agent cline` | `~/.cline/skills` ([docs](https://docs.cline.bot/features/skills)) |
| **Kiro** | installer, `--agent kiro` | `~/.kiro/skills` ([docs](https://kiro.dev/docs/skills/)) |
| **Antigravity** | installer, `--agent antigravity` | `~/.gemini/config/skills` ([docs](https://antigravity.google/docs/skills)) |

`~/.agents/skills` is the shared folder that most agents read, so one copy there serves all of them. With `--project`, the installer uses the project-level folders (`.claude/skills`, `.agents/skills`, `.cline/skills`, `.kiro/skills`) in the current directory instead. Some agents (Cursor, OpenCode, Copilot in VS Code, Goose, Amp, Warp) read both `~/.claude/skills` and `~/.agents/skills`; if you install for Claude Code as well, they may list Unfold twice. Pass `--agent` to pick the folders. Agents not listed here may still read one of these folders; check their docs.

**Without an agent.** The scripts also come as a small Python package, `unfold-map` on PyPI (`pipx install unfold-map`), which gives you an `unfold` command for CI: `unfold scan .`, `unfold check diagram.json`, `unfold build diagram.json page.html`.

## Check that it works

Open a repository in your agent and ask:

> Map this repo. I'm new here and need to understand it.

The agent should load the Unfold skill, scan the repository and write a single HTML page. If it answers without mentioning the skill, check that the skill folder (the one containing `SKILL.md`) is in one of the folders above, then restart the agent.

## Uninstall

`install.sh --uninstall` (or `install.ps1 -Uninstall` on Windows) removes the copies it installed. For the Claude Code plugin, run `/plugin uninstall unfold`.
