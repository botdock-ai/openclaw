// 构造 OpenClaw provider 配置（baseUrl + api + models）。
// 由 catalog.run 和 staticCatalog 共用，区别只在传入的 models 是否真实。
import { BOTDOCK_BASE_URL, staticBotdockModelDefinitions } from './botdock-models.js';
import { loadAllBotdockModels } from './botdock-capabilities-cache.js';
// staticCatalog 用：无须 API key 也能列出的最小模型集。
export function buildStaticBotdockProvider() {
    return {
        baseUrl: BOTDOCK_BASE_URL,
        api: 'openai-completions',
        models: staticBotdockModelDefinitions(),
    };
}
// catalog.run 用：有 API key 时返回完整列表（直接从 BotDock 后端拉）。
export async function buildLiveBotdockProvider() {
    const all = await loadAllBotdockModels();
    return {
        baseUrl: BOTDOCK_BASE_URL,
        api: 'openai-completions',
        models: all.length === 0
            ? staticBotdockModelDefinitions()
            : all.map(({ id, caps }) => ({
                id,
                name: caps.name,
                reasoning: caps.reasoning,
                input: caps.input,
                cost: caps.cost,
                contextWindow: caps.contextWindow,
                maxTokens: caps.maxTokens,
            })),
    };
}
