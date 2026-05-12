// 内存中的 BotDock 模型 capability 缓存。
//
// 模仿 openclaw 内置 provider (extensions/openrouter) 的 pattern：
//   - catalog 保持小而精
//   - 任意 botdock/<modelId> 通过 resolveDynamicModel + prepareDynamicModel 按需解析
//   - 单飞 fetch 防并发
//
// 数据源：https://botdock.ai/api/v1/hosting/store/model-pricing
// 后端格式：entity.BotModelPricing 的 JSON 形态
import { BOTDOCK_DEFAULTS, BOTDOCK_MODELS_URL } from './botdock-models.js';
const FETCH_TIMEOUT_MS = 10_000;
// Cache TTL：超过该时长后下次访问触发后台 refresh（stale-while-revalidate）。
// 后端模型定价改动后，最长这个时间窗口内所有容器都能看到新列表。
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache;
let cacheFetchedAt = 0;
let fetchInFlight;
const skipNextMissRefresh = new Set();
function isCacheStale() {
    return cacheFetchedAt > 0 && Date.now() - cacheFetchedAt > CACHE_TTL_MS;
}
function parseModel(m) {
    const input = [];
    if (m.supportsText !== 0)
        input.push('text');
    if (m.supportsImage)
        input.push('image');
    if (m.supportsAudio)
        input.push('audio');
    if (m.supportsVideo)
        input.push('video');
    if (m.supportsPdf)
        input.push('pdf');
    if (input.length === 0)
        input.push('text');
    return {
        name: m.displayName ?? m.modelName,
        reasoning: m.isReasoning === 1,
        input,
        cost: {
            input: m.inputPrice ?? 0,
            output: m.outputPrice ?? 0,
            cacheRead: 0,
            cacheWrite: 0,
        },
        contextWindow: m.contextWindow ?? BOTDOCK_DEFAULTS.contextWindow,
        maxTokens: m.maxTokens ?? BOTDOCK_DEFAULTS.maxTokens,
    };
}
async function doFetch() {
    try {
        const resp = await fetch(BOTDOCK_MODELS_URL, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!resp.ok)
            return;
        const payload = (await resp.json());
        const items = payload?.data?.list ?? [];
        if (items.length === 0)
            return;
        const map = new Map();
        for (const m of items) {
            if (m.modelName)
                map.set(m.modelName, parseModel(m));
        }
        cache = map;
        cacheFetchedAt = Date.now();
    }
    catch {
        // best-effort: keep whatever is already in cache
    }
}
function triggerFetch() {
    if (fetchInFlight)
        return;
    fetchInFlight = doFetch().finally(() => {
        fetchInFlight = undefined;
    });
}
function ensureCache() {
    if (!cache) {
        triggerFetch();
        return;
    }
    // 命中但已过 TTL：返回旧数据立即响应，后台 refresh（stale-while-revalidate）
    if (isCacheStale() && !fetchInFlight) {
        triggerFetch();
    }
}
// prepareDynamicModel 调用：模型首次使用前确保已加载。
export async function loadBotdockModelCapabilities(modelId) {
    ensureCache();
    if (cache?.has(modelId))
        return;
    let p = fetchInFlight;
    if (!p) {
        triggerFetch();
        p = fetchInFlight;
    }
    if (p)
        await p;
    if (!cache?.has(modelId))
        skipNextMissRefresh.add(modelId);
}
// resolveDynamicModel 调用：同步查 cache，未命中时后台 refresh。
export function getBotdockModelCapabilities(modelId) {
    ensureCache();
    const result = cache?.get(modelId);
    if (!result && skipNextMissRefresh.delete(modelId))
        return undefined;
    if (!result && cache && !fetchInFlight)
        triggerFetch();
    return result;
}
// catalog.run 调用：返回完整 model 列表（首次会阻塞等 fetch）。
export async function loadAllBotdockModels() {
    ensureCache();
    if (!cache && fetchInFlight)
        await fetchInFlight;
    if (!cache)
        return [];
    return Array.from(cache.entries()).map(([id, caps]) => ({ id, caps }));
}
// Test-only
export function _resetCacheForTesting() {
    cache = undefined;
    cacheFetchedAt = 0;
    fetchInFlight = undefined;
    skipNextMissRefresh.clear();
}
