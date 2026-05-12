// 静态常量 + fallback model 列表。
// 真正的动态 catalog 拉取见 botdock-capabilities-cache.ts。

import type { ModelDefinitionConfig } from 'openclaw/plugin-sdk/provider-model-shared';

export const BOTDOCK_BASE_URL = 'https://router.botdock.ai/v1';
export const BOTDOCK_MODELS_URL = 'https://botdock.ai/api/v1/hosting/store/model-pricing';

const DEFAULT_CONTEXT_WINDOW = 128_000;
const DEFAULT_MAX_TOKENS = 8_192;
const DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
} as const;

// Small static fallback used when dynamic catalog discovery hasn't run yet.
// Any actual botdock/<id> still resolves through resolveDynamicModel +
// prepareDynamicModel using the live capabilities cache.
export function staticBotdockModelDefinitions(): ModelDefinitionConfig[] {
  return [
    {
      id: 'MiniMax-M2.7',
      name: 'MiniMax M2.7',
      reasoning: true,
      input: ['text'],
      cost: { ...DEFAULT_COST },
      contextWindow: DEFAULT_CONTEXT_WINDOW,
      maxTokens: DEFAULT_MAX_TOKENS,
    },
  ];
}

export const BOTDOCK_DEFAULTS = {
  contextWindow: DEFAULT_CONTEXT_WINDOW,
  maxTokens: DEFAULT_MAX_TOKENS,
  cost: DEFAULT_COST,
} as const;
