<div align="center">

# claude-sandbox

**Run Claude Code in isolated Docker sandboxes with zero re-authentication.**

One command. Any project. Your existing credentials, skills, and plugins — automatically.

[![npm version](https://img.shields.io/npm/v/claude-sandbox.svg)](https://www.npmjs.com/package/claude-sandbox)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-lightgrey.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)]()

</div>

---

## Quick Start

```bash
# Install globally
npm install -g claude-sandbox

# Open any project and run
cd your-project
claude-sandbox
```

That's it. Claude opens in a sandboxed microVM with your auth, settings, and skills — no browser login.

---

## Why claude-sandbox?

- **Re-authentication hell** — Every new `docker sandbox` instance requires a fresh browser login. Even with a Claude Max subscription, you re-auth every single time.
- **Manual setup** — `docker sandbox` only works from the directory you run it in. No easy way to point it at arbitrary projects.
- **No config sharing** — Your skills, plugins, settings, and CLAUDE.md don't carry over. Every sandbox is a blank slate.
- **First-time setup wizard** — Each new sandbox shows theme picker and onboarding flow, even though you've used Claude 164 times.

`claude-sandbox` solves all of this. One command, zero friction, full isolation.

---

## Features

| Feature | Description |
|---------|-------------|
| **Zero re-auth** | Mounts your host `~/.claude` credentials read-only. No browser login ever. |
| **Any directory** | Point it at any project folder. Sandbox is named by directory and reused automatically. |
| **Config sharing** | Your settings, skills, plugins, agents, and CLAUDE.md are available inside the sandbox. |
| **Writable workspace** | Claude can run commands, write files, create sessions — sandbox has its own writable space. |
| **Auto-resume** | Run `claude-sandbox` again in the same directory — it detects the existing sandbox and resumes. |
| **Host network access** | Reach your local dev servers, databases, and Docker containers via `host.docker.internal`. |
| **Docker socket** | Claude can interact with your running Docker containers from inside the sandbox. |
| **Smart prerequisites** | Missing Docker? Platform-specific install guide shown automatically. |
| **No dependencies** | Pure Node.js. Zero npm dependencies. |

---

## Commands

### Running sandboxes

```bash
claude-sandbox                              # current directory, interactive
claude-sandbox /path/to/project             # any project directory
claude-sandbox . -p "analyze this codebase" # with an initial prompt
claude-sandbox -n my-custom-name            # custom sandbox name
```

### Managing sandboxes

```bash
claude-sandbox list                         # list all sandboxes
claude-sandbox resume claude-sandbox-myapp  # resume a specific sandbox
claude-sandbox stop claude-sandbox-myapp    # stop a sandbox
claude-sandbox rm claude-sandbox-myapp      # remove a sandbox permanently
```

### Diagnostics

```bash
claude-sandbox status                       # check Docker, sandbox plugin, credentials
claude-sandbox --help                       # full usage info
```

---

## Output Examples

### First run

```
$ cd my-api
$ claude-sandbox

[claude-sandbox] Project:  C:\Projects\my-api
[claude-sandbox] Sandbox:  claude-sandbox-my-api
[claude-sandbox] Auth:     max (default_claude_max_20x)

[claude-sandbox] [1/4] Creating sandbox microVM...
✓ Created sandbox claude-sandbox-my-api in VM claude-sandbox-my-api
[claude-sandbox] [1/4] Sandbox created.
[claude-sandbox] [2/4] Linking credentials, settings, skills, plugins...
[claude-sandbox] [2/4] Auth configured. No browser login needed.
[claude-sandbox] [3/4] Verifying sandbox state...
[claude-sandbox] [3/4] All checks passed: credentials, config, settings, writable dirs.
[claude-sandbox] [4/4] Launching Claude...

╭─── Claude Code ─────────────────────────────────╮
│          Welcome back!                          │
│   Opus 4.6 (1M context) · Claude Max           │
╰─────────────────────────────────────────────────╯
```

### Second run (auto-resume)

```
$ claude-sandbox

[claude-sandbox] Project:  C:\Projects\my-api
[claude-sandbox] Sandbox:  claude-sandbox-my-api
[claude-sandbox] Sandbox exists. Resuming...
```

### Status check

```
$ claude-sandbox status

Prerequisite Check

  ✓ Docker (v29.2.1)
  ✓ Docker daemon
  ✓ Docker Sandbox
  ✓ Claude Code CLI

All prerequisites met. Ready to go.

  Credentials:     found
  Subscription:    max (default_claude_max_20x)
  Claude home:     C:\Users\you\.claude
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Your Host Machine                                      │
│                                                         │
│  ~/.claude/                    Project Directory         │
│  ├── .credentials.json ──────┐  /path/to/project ──┐   │
│  ├── settings.json ──────────┤                      │   │
│  ├── skills/ ────────────────┤                      │   │
│  ├── plugins/ ───────────────┤                      │   │
│  └── CLAUDE.md ──────────────┤                      │   │
│                               │                      │   │
│  ┌────────────────────────────┼──────────────────────┼─┐│
│  │  Docker Sandbox (microVM)  │                      │ ││
│  │                            ▼                      ▼ ││
│  │  /home/agent/.claude/    /j/path/to/project/       ││
│  │  ├── .credentials.json → symlink (read-only)       ││
│  │  ├── settings.json ────→ symlink (read-only)       ││
│  │  ├── skills/ ──────────→ symlink (read-only)       ││
│  │  ├── session-env/ ─────→ writable (sandbox-local)  ││
│  │  ├── sessions/ ────────→ writable (sandbox-local)  ││
│  │  └── history.jsonl ────→ writable (sandbox-local)  ││
│  │                                                     ││
│  │  Claude Code runs here with full permissions        ││
│  │  --dangerously-skip-permissions (safe in sandbox)   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Read-only from host** (symlinked): credentials, settings, skills, plugins, agents, CLAUDE.md

**Writable in sandbox** (local): session-env, sessions, history, cache, backups, file-history, tasks

**Project directory**: mounted read-write inside the sandbox

---

## Configuration

Configuration is automatic. `claude-sandbox` detects your existing Claude Code setup and shares it.

| Item | Source | Access | Notes |
|------|--------|--------|-------|
| Credentials | `~/.claude/.credentials.json` | Read-only | OAuth token from your subscription |
| Settings | `~/.claude/settings.json` | Read-only | Permissions, deny rules |
| Skills | `~/.claude/skills/` | Read-only | Custom skills |
| Plugins | `~/.claude/plugins/` | Read-only | Installed plugins |
| Agents | `~/.claude/agents/` | Read-only | Custom agents |
| CLAUDE.md | `~/.claude/CLAUDE.md` | Read-only | Global instructions |
| Startup config | `~/.claude.json` | Copied | Prevents first-time setup wizard |

---

## Network & Security

### What's isolated

- **Filesystem** — Sandbox cannot access host files outside the mounted project directory
- **Credentials** — Host `~/.claude` is mounted read-only. Sandbox cannot modify your auth tokens.
- **Destructive commands** — `rm -rf /` only affects the sandbox. Host is untouched.
- **Disposable** — `claude-sandbox rm` wipes everything clean.

### What's accessible

- **Internet** — Full access (required for Anthropic API, package registries, etc.)
- **Host machine** — Reachable via `host.docker.internal` (hit your local dev servers, databases)
- **Docker socket** — Available inside sandbox (interact with running containers)
- **Project files** — Read-write access to the mounted project directory

---

## Setup & Prerequisites

`claude-sandbox` checks prerequisites on every run. If something is missing, it shows platform-specific install instructions automatically. But here's the full setup if you want to do it manually.

### Requirements

| Requirement | Version | Required? | Notes |
|-------------|---------|-----------|-------|
| Node.js | >= 18 | Yes | For the CLI (`npm install -g claude-sandbox`) |
| Docker Desktop | >= 4.40 | Yes | Provides Docker Engine + Docker Sandbox |
| Docker Sandbox | >= 0.12 | Yes | Built into Docker Desktop 4.40+. This is the `docker sandbox` command. |
| Claude Code CLI | Any | Yes | Must be installed and authenticated on your host machine |

### Step-by-step setup

#### 1. Install Node.js (if not installed)

```bash
# Windows (winget)
winget install OpenJS.NodeJS.LTS

# macOS (Homebrew)
brew install node

# Linux
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify: `node --version` should print `v18.x` or higher.

#### 2. Install Docker Desktop

Docker Desktop includes both Docker Engine and the Docker Sandbox plugin.

```bash
# Windows (winget)
winget install Docker.DockerDesktop
# Then restart your computer. WSL 2 is required — install with: wsl --install

# macOS (Homebrew)
brew install --cask docker
# Then open Docker.app from Applications

# Linux
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then install Docker Desktop for the Sandbox plugin
# See: https://docs.docker.com/desktop/install/linux/
```

Verify: `docker version` should show Client and Server versions. `docker sandbox version` should print a version number.

#### 3. Install and authenticate Claude Code

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Authenticate (opens browser for OAuth login)
claude

# This creates ~/.claude/.credentials.json which claude-sandbox will use
```

Verify: `claude --version` should print a version. Running `claude` should open the interactive session without asking for login.

#### 4. Install claude-sandbox

```bash
npm install -g claude-sandbox

# Verify everything
claude-sandbox status
```

You should see all green checkmarks:

```
Prerequisite Check

  ✓ Docker (v29.x)
  ✓ Docker daemon
  ✓ Docker Sandbox
  ✓ Claude Code CLI

All prerequisites met. Ready to go.

  Credentials:     found
  Subscription:    max (default_claude_max_20x)
  Claude home:     C:\Users\you\.claude
```

#### 5. Run it

```bash
cd your-project
claude-sandbox
```

### Troubleshooting

**`docker sandbox` command not found**
- Update Docker Desktop to 4.40 or later. Docker Sandbox is a built-in plugin.

**Claude asks for browser login inside sandbox**
- Your host credentials may have expired. Run `claude` on your host to refresh, then restart the sandbox.

**"Failed to create sandbox" error**
- Make sure Docker Desktop is running (check system tray / menu bar).
- On Windows, ensure WSL 2 is installed: `wsl --install`

**Sandbox is slow to create the first time**
- First run downloads the sandbox template image (~500MB). Subsequent runs reuse the cached image and are fast.

### Platform support

| Platform | Docker Install |
|----------|---------------|
| Windows | Docker Desktop (WSL 2 backend) |
| macOS | Docker Desktop (`brew install --cask docker`) |
| Linux | Docker Engine (`curl -fsSL https://get.docker.com \| sh`) + Docker Desktop for Sandbox |

---

## FAQ

**Q: Does this use my Claude subscription?**
Yes. It mounts your existing credentials read-only. Your Claude Max/Pro subscription is used.

**Q: Can the sandbox modify my host files?**
Only files inside the mounted project directory. Your `~/.claude` config is read-only. Everything outside the project is inaccessible.

**Q: What happens when I close the terminal?**
The sandbox stops but persists. Run `claude-sandbox` again in the same directory and it auto-resumes.

**Q: Can I run multiple sandboxes?**
Yes. Each project directory gets its own sandbox (`claude-sandbox-<dirname>`). Run as many as you want.

**Q: Why `--dangerously-skip-permissions`?**
Inside the sandbox, there's nothing dangerous to skip — the sandbox IS the permission boundary. This lets Claude work without constant permission prompts.

**Q: Does this make network calls?**
The `claude-sandbox` CLI itself makes zero network calls. It only runs local `docker` commands and reads local files. Claude inside the sandbox connects to Anthropic's API.

**Q: My token expired. What do I do?**
Run `claude` on your host machine (outside the sandbox) to refresh your token. Then restart the sandbox — it reads the latest credentials from your host.

---

## Contributing

```bash
git clone https://github.com/anthropics/claude-sandbox.git
cd claude-sandbox
npm link        # install globally for development
claude-sandbox status  # verify it works
```

---

## License

MIT
