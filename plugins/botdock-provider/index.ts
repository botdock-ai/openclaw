// @botdock/openclaw-provider
//
// 注册一个 OpenClaw provider 'botdock'，model catalog 来自 BotDock 管理端
// (status=1 的 bot_model_pricing 记录)。
//
// 架构 (mirroring openclaw bundled provider pattern + zenmux external port):
//   - catalog.run: 有 API key 时返回完整动态 model 列表
//   - staticCatalog: 无 key 时也能展示一个最小 fallback model
//   - resolveDynamicModel + prepareDynamicModel: 支持任意 botdock/<modelId>
//
// 凭证：BOTDOCK_API_KEY env (manifest 中通过 providerAuthEnvVars 声明)
// 后端 catalog: https://botdock.ai/api/v1/hosting/store/model-pricing
// 上游路由: https://router.botdock.ai/v1

import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { createProviderApiKeyAuthMethod } from 'openclaw/plugin-sdk/provider-auth';
import type { OpenClawConfig } from 'openclaw/plugin-sdk/provider-onboard';
import { applyBotdockConfig } from './onboard.js';
import {
  buildLiveBotdockProvider,
  buildStaticBotdockProvider,
} from './provider-catalog.js';
import {
  getBotdockModelCapabilities,
  loadAllBotdockModels,
  loadBotdockModelCapabilities,
} from './botdock-capabilities-cache.js';
import { BOTDOCK_BASE_URL, BOTDOCK_DEFAULTS } from './botdock-models.js';

const PROVIDER_ID = 'botdock';

function buildDynamicBotdockModel(ctx: { modelId: string }) {
  const caps = getBotdockModelCapabilities(ctx.modelId);
  return {
    id: ctx.modelId,
    name: caps?.name ?? ctx.modelId,
    api: 'openai-completions' as const,
    provider: PROVIDER_ID,
    baseUrl: BOTDOCK_BASE_URL,
    reasoning: caps?.reasoning ?? false,
    input: caps?.input ?? (['text'] as Array<'text' | 'image'>),
    cost: caps?.cost ?? { ...BOTDOCK_DEFAULTS.cost },
    contextWindow: caps?.contextWindow ?? BOTDOCK_DEFAULTS.contextWindow,
    maxTokens: caps?.maxTokens ?? BOTDOCK_DEFAULTS.maxTokens,
  };
}

export default definePluginEntry({
  id: PROVIDER_ID,
  name: 'BotDock Provider',
  description: 'Curated BotDock model catalog (BotDock Router)',
  register(api) {
    api.registerProvider({
      id: PROVIDER_ID,
      label: 'BotDock',
      envVars: ['BOTDOCK_API_KEY'],
      auth: [
        createProviderApiKeyAuthMethod({
          providerId: PROVIDER_ID,
          methodId: 'api-key',
          label: 'BotDock API key',
          hint: 'Issued by the BotDock admin (sk-... token)',
          optionKey: 'botdockApiKey',
          flagName: '--botdock-api-key',
          envVar: 'BOTDOCK_API_KEY',
          promptMessage: 'Enter BotDock API key',
          expectedProviders: [PROVIDER_ID],
          applyConfig: (cfg: unknown) => applyBotdockConfig(cfg as OpenClawConfig),
          wizard: {
            choiceId: 'botdock-api-key',
            choiceLabel: 'BotDock API key',
            groupId: 'botdock',
            groupLabel: 'BotDock',
            groupHint: 'API key',
          },
        }),
      ],
      catalog: {
        order: 'simple',
        run: async (ctx: {
          resolveProviderApiKey: (id: string) => { apiKey?: string };
        }) => {
          const apiKey = ctx.resolveProviderApiKey(PROVIDER_ID).apiKey;
          if (!apiKey) return null;
          const provider = await buildLiveBotdockProvider();
          return { provider: { ...provider, apiKey } };
        },
      },
      staticCatalog: {
        order: 'simple',
        run: async () => ({ provider: buildStaticBotdockProvider() }),
      },
      // 给 OpenClaw model picker UI / `infer model providers` 列模型用。
      // 与 catalog.run 不同：augment 即使没启用 catalog 也会被调，专门服务 UI 列表。
      augmentModelCatalog: async (ctx: {
        env?: Record<string, string | undefined>;
      }) => {
        const envKey = ctx.env?.['BOTDOCK_API_KEY']?.trim();
        if (!envKey) return [];
        const all = await loadAllBotdockModels();
        return all.map(({ id, caps }) => ({
          provider: PROVIDER_ID,
          id,
          name: caps.name,
          reasoning: caps.reasoning,
          input: caps.input,
          cost: caps.cost,
          contextWindow: caps.contextWindow,
          maxTokens: caps.maxTokens,
        }));
      },
      resolveDynamicModel: (ctx: { modelId: string }) =>
        buildDynamicBotdockModel(ctx),
      prepareDynamicModel: async (ctx: { modelId: string }) => {
        await loadBotdockModelCapabilities(ctx.modelId);
      },
    });
  },
});
