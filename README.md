# Openclaw Automated Build

## Quick Start

### Minimal (`docker run`)

```bash
docker run -d \
  --name openclaw \
  -p 8080:8080 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e OPENCLAW_GATEWAY_TOKEN=my-secret-token \
  -v openclaw-data:/data \
  botdockai/openclaw:latest
```

- `ANTHROPIC_API_KEY` — any [supported provider key](#ai-providers-at-least-one-required) works (OpenAI, Gemini, etc.)
- `OPENCLAW_GATEWAY_TOKEN` — bearer token for gateway auth (required)
- `/data` — persists state, config, and workspace across restarts

### Full Setup (docker-compose)

See [`docker-compose.yml`](docker-compose.yml).

```bash
docker compose up -d
```

**After starting:**

- **Openclaw UI** — `http://localhost:8080`

## Architecture

```
┌─────────────────────────────────────────────┐
│  Docker container (botdockai/openclaw)     │
│  Runs as: openclaw user (uid 1000)          │
│                                             │
│  Baked in: Linuxbrew, Go, uv, nano, vi     │
│  Persistent volume: /data                   │
│    ├── .openclaw/      (state & config)     │
│    └── workspace/      (user projects)      │
│                                             │
│  ┌────────────────────────────────────┐     │
│  │  openclaw gateway       :8080     │     │
│  │  (direct access, no proxy)        │     │
│  └────────────────────────────────────┘     │
│                                             │
│  entrypoint.sh                              │
│    1. run custom init script (optional)     │
│    2. configure.js (env vars → json)        │
│    3. exec openclaw gateway                 │
└─────────────────────────────────────────────┘
```

Two-layer Docker build:
1. **Base image** (`Dockerfile.base`) — builds openclaw from source, installs Linuxbrew/Go/uv/nano/vi. Tagged `botdockai/openclaw-base:<version>`.
2. **Final image** (`Dockerfile`) — FROM base, adds env-to-config scripts, runs as non-root `openclaw` user. Tagged `botdockai/openclaw:<version>`.

## Files

```
.github/workflows/auto-update.yml   — cron every 6h, check openclaw releases, build+push
.github/workflows/build.yml         — CI on push/PR (build only, no push)
Dockerfile.base                     — multi-stage: build openclaw from source → slim runtime
Dockerfile                          — FROM base, add config scripts + entrypoint, USER openclaw
scripts/configure.js                — reads env vars, writes/patches openclaw.json
scripts/entrypoint.sh               — container entrypoint: configure → gateway
scripts/smoke.js                    — smoke test (openclaw --version)
.dockerignore                       — standard ignores
.env.example                        — env var reference
```

## auto-update.yml workflow

```
Jobs:
1. check-release        — fetch latest openclaw/openclaw release, skip if image exists
2. build-base           — matrix amd64/arm64, build Dockerfile.base, push per-arch
3. merge-base-manifest  — merge into botdockai/openclaw-base:<ver> + :latest
4. build-final          — matrix amd64/arm64, build Dockerfile, push per-arch
5. merge-final-manifest — merge into botdockai/openclaw:<ver> + :latest
```

Triggers: `schedule: '0 */6 * * *'` + `workflow_dispatch` (version, force_rebuild, skip_latest_tag).

## Secrets needed (repo settings)

- `DOCKERHUB_USERNAME` — Docker Hub username
- `DOCKERHUB_TOKEN` — Docker Hub access token
- `GITHUB_TOKEN` — auto-provided by GitHub Actions

## Environment variables

### AI Providers (at least one required)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key. Configures Claude models. Set as primary when present. |
| `OPENAI_API_KEY` | OpenAI API key. Primary if no Anthropic key. |
| `OPENROUTER_API_KEY` | OpenRouter API key. Primary if no Anthropic/OpenAI key. |
| `GEMINI_API_KEY` | Google Gemini API key. Primary if no other provider key set. |
| `XAI_API_KEY` | xAI API key. Configures Grok models. |
| `GROQ_API_KEY` | Groq API key. Configures Llama models on Groq hardware. |
| `MISTRAL_API_KEY` | Mistral API key. |
| `CEREBRAS_API_KEY` | Cerebras API key. |
| `VENICE_API_KEY` | Venice AI API key (OpenAI-compatible). |
| `MOONSHOT_API_KEY` | Moonshot API key (OpenAI-compatible). |
| `KIMI_API_KEY` | Kimi Coding API key (Anthropic-compatible). |
| `MINIMAX_API_KEY` | MiniMax API key (Anthropic-compatible). |
| `ZAI_API_KEY` | ZAI API key. Configures GLM models. |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway API key. |
| `OPENCODE_API_KEY` | OpenCode API key. Also accepted as `OPENCODE_ZEN_API_KEY`. |
| `SYNTHETIC_API_KEY` | Synthetic API key (Anthropic-compatible). |
| `COPILOT_GITHUB_TOKEN` | GitHub Copilot token. |
| `XIAOMI_API_KEY` | Xiaomi MiMo API key (Anthropic-compatible). |
| `BOTDOCK_API_KEY` | BotDock provider API key. Activates the bundled `botdock` plugin's curated model catalog (model ids prefixed with `botdock/`). |

Multiple providers can be set simultaneously. If a provider env var is removed, that provider section is cleaned from `openclaw.json` on next start.

### Deepgram (audio transcription, optional)

| Variable | Description |
|---|---|
| `DEEPGRAM_API_KEY` | Deepgram API key. Enables audio transcription via Nova 3 model. |

### Amazon Bedrock (uses AWS credential chain)

| Variable | Default | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | | AWS access key. Both `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` required. |
| `AWS_SECRET_ACCESS_KEY` | | AWS secret key. |
| `AWS_REGION` | `us-east-1` | AWS region for Bedrock runtime endpoint. |
| `AWS_SESSION_TOKEN` | | Optional session token for temporary credentials. |
| `BEDROCK_PROVIDER_FILTER` | `["anthropic"]` | Filter Bedrock model discovery by provider. |

### Ollama (local models, no API key needed)

| Variable | Description |
|---|---|
| `OLLAMA_BASE_URL` | Ollama server URL (e.g. `http://host.docker.internal:11434`). Enables Ollama provider when set. |

### Model selection

| Variable | Description |
|---|---|
| `OPENCLAW_PRIMARY_MODEL` | Override auto-selected primary model. Format: `provider/model-id`. |

### Gateway

| Variable | Default | Description |
|---|---|---|
| `OPENCLAW_GATEWAY_TOKEN` | *(required)* | Bearer token for gateway auth. |
| `OPENCLAW_GATEWAY_PORT` | `8080` | Port the gateway binds to. |
| `OPENCLAW_STATE_DIR` | `/data/.openclaw` | Persistent state directory. Mount a volume here. |
| `OPENCLAW_WORKSPACE_DIR` | `/data/workspace` | Workspace directory for openclaw projects. |
| `OPENCLAW_CONFIG_PATH` | `<STATE_DIR>/openclaw.json` | Override path to the config file. |
| `OPENCLAW_CUSTOM_CONFIG` | `/app/config/openclaw.json` | Path to a user-provided custom JSON config. Env vars override on top. |
| `ORIGIN_URL` | | Single URL written to `gateway.controlUi.allowedOrigins` as a 1-element array. Required when accessing the Control UI through a reverse proxy / FQDN (e.g. `https://openclaw.example.com`); without it the gateway rejects browser-origin WebSockets. |

### Hooks (webhook automation, optional)

| Variable | Default | Description |
|---|---|---|
| `HOOKS_ENABLED` | | Set to `true` to enable the webhook hooks endpoint. |
| `HOOKS_TOKEN` | | Shared secret for hook request auth. |
| `HOOKS_PATH` | `/hooks` | Path prefix for hook endpoints. |

Docs: https://docs.openclaw.ai/automation/webhook

### Browser tool (remote CDP, optional)

| Variable | Default | Description |
|---|---|---|
| `BROWSER_CDP_URL` | | Remote CDP URL pointing to an external Chrome instance (e.g. `http://browser:9222`). Required to activate browser tool. |
| `BROWSER_EVALUATE_ENABLED` | `false` | Allow JavaScript evaluation in page context. |
| `BROWSER_SNAPSHOT_MODE` | | Default snapshot mode. |
| `BROWSER_REMOTE_TIMEOUT_MS` | `1500` | HTTP timeout in ms for remote CDP connection. |
| `BROWSER_REMOTE_HANDSHAKE_TIMEOUT_MS` | `3000` | WebSocket handshake timeout in ms. |
| `BROWSER_DEFAULT_PROFILE` | | Override the default browser profile name. |

Requires a separate browser container or service. Docs: https://docs.openclaw.ai/tools/browser

### Channels (optional)

| Variable | Default | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | | Telegram bot token from BotFather. |
| `TELEGRAM_DM_POLICY` | `pairing` | DM access policy: `pairing`, `allowlist`, `open`, or `disabled`. |
| `TELEGRAM_ALLOW_FROM` | | Comma-separated allowlist of user IDs/usernames. |
| `TELEGRAM_GROUP_POLICY` | `allowlist` | Group access policy. |
| `TELEGRAM_GROUP_ALLOW_FROM` | | Comma-separated group sender allowlist. |
| `DISCORD_BOT_TOKEN` | | Discord bot token. Enable MESSAGE CONTENT INTENT in Discord Developer Portal. |
| `DISCORD_DM_POLICY` | `pairing` | DM access policy. |
| `DISCORD_DM_ALLOW_FROM` | | Comma-separated user IDs/names for DM allowlist. |
| `SLACK_BOT_TOKEN` | | Slack bot token (`xoxb-...`). Both bot + app token required. |
| `SLACK_APP_TOKEN` | | Slack app token (`xapp-...`). |
| `WHATSAPP_ENABLED` | | Set to `true` to enable WhatsApp channel. Uses QR/pairing code auth. |

See `.env.example` for full channel configuration options.

If a channel env var is removed, that channel is cleaned from config on next start. WhatsApp env vars fully overwrite any existing WhatsApp config (no merge with custom JSON).

### Provider overrides (optional)

| Variable | Description |
|---|---|
| `AI_GATEWAY_BASE_URL` | Custom base URL for AI gateway. |
| `ANTHROPIC_BASE_URL` | Override Anthropic API base URL. |
| `MOONSHOT_BASE_URL` | Override Moonshot API base URL. |
| `KIMI_BASE_URL` | Override Kimi Coding API base URL. |

### Extra system packages (build-time only)

| Variable | Description |
|---|---|
| `OPENCLAW_DOCKER_APT_PACKAGES` | **Build-time ARG** (not a runtime env var). Pass via `docker build --build-arg OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg python3"`. |

### Baked-in tools

The base image includes common skill dependencies:

- **Linuxbrew** — `/home/linuxbrew/.linuxbrew` — skills that need `brew` work out of the box
- **Go** — `/usr/local/go` — for Go-based skills and tools
- **uv** — fast Python package manager for Python-based skills
- **build-essential**, **git**, **curl** — common build dependencies
- **nano**, **vim-tiny** — text editors

Note: packages installed at runtime (e.g. via `brew install`) are part of the container filesystem and do **not** persist across container rebuilds.

### Custom init script (optional)

| Variable | Default | Description |
|---|---|---|
| `OPENCLAW_DOCKER_INIT_SCRIPT` | *(none)* | Script that runs on every container start before openclaw starts. Must be executable and idempotent. Runs as non-root `openclaw` user. |

### Coolify-specific (auto-set by Coolify)

| Variable | Description |
|---|---|
| `COOLIFY_FQDN` | Public FQDN assigned by Coolify. |
| `COOLIFY_URL` | Coolify dashboard URL. |
| `COOLIFY_BRANCH` | Git branch deployed. |

## Custom JSON config (Docker mount)

For settings too complex for flat env vars (e.g. `channels.*.groups`, agent defaults, plugin config), mount a custom JSON file into the container:

```bash
docker run -v ./my-openclaw.json:/app/config/openclaw.json ...
```

Override the mount path with `OPENCLAW_CUSTOM_CONFIG` env var if needed.

**3-tier merge order** (configure.js):

1. Custom JSON (`/app/config/openclaw.json`) — base layer
2. Persisted state (`<STATE_DIR>/openclaw.json`) — preserves runtime changes from previous runs
3. Env vars — applied on top, always win

Arrays are replaced, not concatenated. Provider API keys are always read from env vars, never from JSON.

**Note:** WhatsApp is a special case — when `WHATSAPP_ENABLED=true`, env vars fully overwrite the WhatsApp config block. For all other channels, custom JSON keys are preserved and env vars merge on top.

## Upgrading from root-based containers

Older versions of this image ran as `root`. The current image runs as the `openclaw` user (uid 1000). If you are upgrading an existing container, the `/data` volume will still be owned by root, causing permission errors like:

```
mkdir: cannot create directory '/data/.openclaw': Permission denied
```

**Fix before upgrading** — run this on the **old (running) container**:

```bash
docker exec <container-name> chown -R 1000:1000 /data
```

**Fix after upgrading** (old container already stopped) — use a temporary Alpine container:

```bash
# Find your volume name
docker volume ls | grep openclaw

# Fix permissions
docker run --rm -v <volume-name>:/data alpine chown -R 1000:1000 /data
```

Replace `<volume-name>` with the actual volume name (e.g. `mystack_openclaw-data`).

## Security

- Container runs as non-root `openclaw` user (uid 1000)
- `cap_drop: ALL` in docker-compose (drop all Linux capabilities)
- `no-new-privileges: true` (prevent privilege escalation via setuid)
- No runtime `apt-get` — extra packages are installed at build time only
- Gateway token is required (no auto-generation)

## Notes

- Openclaw uses CalVer: `v2026.1.29` (roughly daily releases). Detected via GitHub Releases API.
- Using native `ubuntu-24.04-arm` runners for arm64 builds.
- Config is environment-driven: set env vars → restart container → config updates automatically.
