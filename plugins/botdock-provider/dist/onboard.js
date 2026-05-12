// onboard 阶段把 botdock provider 写进 OpenClaw 主配置（agents.defaults.models / providers）。
// 仿 ZenMux：不预填 model allowlist（留空让所有 catalog 模型可选），只设默认 model。
import { applyAgentDefaultModelPrimary, applyProviderConfigWithModelCatalog, } from 'openclaw/plugin-sdk/provider-onboard';
import { BOTDOCK_BASE_URL } from './botdock-models.js';
export const BOTDOCK_DEFAULT_MODEL_REF = 'botdock/MiniMax-M2.7';
export function applyBotdockProviderConfig(cfg) {
    // 留空 agentModels / catalogModels，让运行时 catalog.run 成为模型列表的唯一来源。
    return applyProviderConfigWithModelCatalog(cfg, {
        agentModels: cfg.agents?.defaults?.models ?? {},
        providerId: 'botdock',
        api: 'openai-completions',
        baseUrl: BOTDOCK_BASE_URL,
        catalogModels: [],
    });
}
export function applyBotdockConfig(cfg) {
    return applyAgentDefaultModelPrimary(applyBotdockProviderConfig(cfg), BOTDOCK_DEFAULT_MODEL_REF);
}
