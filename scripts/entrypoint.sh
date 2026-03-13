#!/usr/bin/env bash
set -e

STATE_DIR="${OPENCLAW_STATE_DIR:-/data/.openclaw}"
WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-/data/workspace}"
GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-8080}"

echo "[entrypoint] state dir: $STATE_DIR"
echo "[entrypoint] workspace dir: $WORKSPACE_DIR"

# ── Ensure directories exist (defensive for bind mounts) ──────────────────────
mkdir -p "$STATE_DIR/agents/main/sessions" "$STATE_DIR/credentials" "$WORKSPACE_DIR"
mkdir -p "${NPM_CONFIG_PREFIX:-/data/npm-global}/bin" \
         "${UV_TOOL_DIR:-/data/uv/tools}/bin" \
         "${UV_CACHE_DIR:-/data/uv/cache}" \
         "${GOPATH:-/data/go}/bin"

# ── Require OPENCLAW_GATEWAY_TOKEN ───────────────────────────────────────────
if [ -z "${OPENCLAW_GATEWAY_TOKEN:-}" ]; then
  echo "[entrypoint] ERROR: OPENCLAW_GATEWAY_TOKEN is required."
  echo "[entrypoint] Generate one with: openssl rand -hex 32"
  exit 1
fi

# ── Require at least one AI provider API key env var ─────────────────────────
HAS_PROVIDER=0
for key in ANTHROPIC_API_KEY OPENAI_API_KEY OPENROUTER_API_KEY GEMINI_API_KEY \
           XAI_API_KEY GROQ_API_KEY MISTRAL_API_KEY CEREBRAS_API_KEY \
           VENICE_API_KEY MOONSHOT_API_KEY KIMI_API_KEY MINIMAX_API_KEY \
           ZAI_API_KEY AI_GATEWAY_API_KEY OPENCODE_API_KEY OPENCODE_ZEN_API_KEY \
           SYNTHETIC_API_KEY COPILOT_GITHUB_TOKEN XIAOMI_API_KEY; do
  [ -n "${!key:-}" ] && HAS_PROVIDER=1 && break
done
[ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ] && HAS_PROVIDER=1
[ -n "${OLLAMA_BASE_URL:-}" ] && HAS_PROVIDER=1
if [ "$HAS_PROVIDER" -eq 0 ]; then
  echo "[entrypoint] ERROR: At least one AI provider API key env var is required."
  echo "[entrypoint] Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, etc."
  exit 1
fi

# ── Export state/workspace dirs ───────────────────────────────────────────────
export OPENCLAW_STATE_DIR="$STATE_DIR"
export OPENCLAW_WORKSPACE_DIR="$WORKSPACE_DIR"
export HOME="${STATE_DIR%/.openclaw}"

# ── Run custom init script (if provided) ──────────────────────────────────────
# NOTE: Runs as openclaw user (non-root). Root operations are not supported.
INIT_SCRIPT="${OPENCLAW_DOCKER_INIT_SCRIPT:-}"
if [ -n "$INIT_SCRIPT" ]; then
  if [ ! -f "$INIT_SCRIPT" ]; then
    echo "[entrypoint] WARNING: init script not found: $INIT_SCRIPT"
  else
    echo "[entrypoint] running init script: $INIT_SCRIPT (as openclaw user)"
    "$INIT_SCRIPT" || echo "[entrypoint] WARNING: init script exited with code $?"
  fi
fi

# ── Configure openclaw from env vars ──────────────────────────────────────────
echo "[entrypoint] running configure..."
node /app/scripts/configure.js
chmod 600 "$STATE_DIR/openclaw.json" 2>/dev/null || true

# ── Auto-fix doctor suggestions ───────────────────────────────────────────────
echo "[entrypoint] running openclaw doctor --fix..."
cd /opt/openclaw/app
openclaw doctor --fix 2>&1 || true

# ── Clean up stale lock files ─────────────────────────────────────────────────
rm -f /tmp/openclaw-gateway.lock 2>/dev/null || true
rm -f "$STATE_DIR/gateway.lock" 2>/dev/null || true

# ── Start openclaw gateway ────────────────────────────────────────────────────
echo "[entrypoint] starting openclaw gateway on port $GATEWAY_PORT..."
exec openclaw gateway run
