# 已移除的 API_KEY 校验（备份，便于恢复）

为了允许在没有任何 AI provider env var 的情况下也能启动容器，下面两块校验已被删除。
如需恢复，按位置把对应代码块原样粘回即可。

---

## 1. `scripts/entrypoint.sh`

**位置**：原本位于"Require OPENCLAW_GATEWAY_TOKEN"块之后、"Export state/workspace dirs"块之前（约第 25-40 行）。

**删除的内容**：

```bash
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

```

**恢复步骤**：把上面整段（包含末尾空行）粘回到 `# ── Export state/workspace dirs ───…` 这一行之前。

---

## 2. `scripts/configure.js`

**位置**：原本位于"Browser tool (remote CDP)"块之后、"Write config"块之前（约第 617-638 行）。

**删除的内容**：

```javascript
// ── Validate: at least one provider API key env var must be set ──────────────
// All providers (built-in and custom) read API keys from env vars, not from JSON.
const hasProvider =
  builtinProviders.some(([envKey]) => process.env[envKey]) ||
  !!opencodeKey ||
  !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
  !!ollamaUrl ||
  // Custom proxy providers also need env var keys
  !!process.env.VENICE_API_KEY || !!process.env.MINIMAX_API_KEY ||
  !!process.env.MOONSHOT_API_KEY || !!process.env.KIMI_API_KEY ||
  !!process.env.SYNTHETIC_API_KEY || !!process.env.XIAOMI_API_KEY;

if (!hasProvider) {
  console.error("[configure] ERROR: No AI provider API key set.");
  console.error("[configure] Providers require an env var — API keys are never read from the JSON config.");
  console.error("[configure] Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY,");
  console.error("[configure]   XAI_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY, CEREBRAS_API_KEY, ZAI_API_KEY,");
  console.error("[configure]   AI_GATEWAY_API_KEY, OPENCODE_API_KEY, COPILOT_GITHUB_TOKEN, VENICE_API_KEY,");
  console.error("[configure]   MOONSHOT_API_KEY, KIMI_API_KEY, MINIMAX_API_KEY, SYNTHETIC_API_KEY, XIAOMI_API_KEY,");
  console.error("[configure]   AWS_ACCESS_KEY_ID+AWS_SECRET_ACCESS_KEY (Bedrock), or OLLAMA_BASE_URL (local)");
  process.exit(1);
}

```

**恢复步骤**：把上面整段（包含末尾空行）粘回到 `// ── Write config ───…` 这一行之前。

---

## 备注

- 仍保留的校验：`OPENCLAW_GATEWAY_TOKEN` 必填（`scripts/entrypoint.sh` 第 19-23 行）。
- openclaw 网关自身在没有任何 provider 的情况下也能启动；用户可在启动后通过 UI 或自定义 JSON 配置 provider。
- `git log scripts/entrypoint.sh scripts/configure.js` 也能从历史中找回原文。
