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
$ claude-sandbox /path/to/my-api

[claude-sandbox] Project:  C:\Projects\my-api
[claude-sandbox] Sandbox:  claude-sandbox-my-api
[claude-sandbox] Auth: max subscription (default_claude_max_20x)
[claude-sandbox] Creating sandbox...
[claude-sandbox] Setting up auth and config...
[claude-sandbox] Verifying sandbox state...
[claude-sandbox]   credentials: OK
[claude-sandbox]   claude.json: OK
[claude-sandbox]   settings: OK
[claude-sandbox]   session-env: WRITABLE
[claude-sandbox] Launching Claude...

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
[claude-sandbox] Sandbox 'claude-sandbox-my-api' already exists.
[claude-sandbox] Resuming existing sandbox...
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

### Auto-detection

`claude-sandbox` checks prerequisites on every run. If something is missing, it shows platform-specific install instructions.

### Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 18 | For the CLI |
| Docker | >= 29.x | With Docker Desktop |
| Docker Sandbox | >= 0.12 | Comes with Docker Desktop 4.40+ |
| Claude Code | Any | Must be authenticated on host (`claude` CLI) |

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
