// SDK 类型垫片 —— OpenClaw runtime 在加载 plugin 时通过 root-alias 提供实际实现。
// 这里只为了 tsc 编译通过。

declare module 'openclaw/plugin-sdk/plugin-entry' {
  export interface PluginRegisterApi {
    registerProvider(def: unknown): void;
  }

  export interface PluginEntry {
    id: string;
    name?: string;
    description?: string;
    register(api: PluginRegisterApi): void | Promise<void>;
  }

  export function definePluginEntry(entry: PluginEntry): PluginEntry;
}

declare module 'openclaw/plugin-sdk/provider-auth' {
  export interface ApiKeyAuthMethodInput {
    providerId: string;
    methodId: string;
    label: string;
    hint?: string;
    optionKey?: string;
    flagName?: string;
    envVar?: string;
    promptMessage?: string;
    defaultModel?: string;
    expectedProviders?: string[];
    applyConfig?: (cfg: unknown) => unknown;
    wizard?: {
      choiceId: string;
      choiceLabel: string;
      groupId?: string;
      groupLabel?: string;
      groupHint?: string;
    };
  }

  export function createProviderApiKeyAuthMethod(
    opts: ApiKeyAuthMethodInput,
  ): unknown;
}

declare module 'openclaw/plugin-sdk/provider-model-shared' {
  export interface ModelCost {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  }

  export interface ModelDefinitionConfig {
    id: string;
    name: string;
    reasoning?: boolean;
    input?: Array<'text' | 'image' | 'audio' | 'video' | 'pdf'>;
    cost?: ModelCost;
    contextWindow?: number;
    maxTokens?: number;
  }

  export interface ModelProviderConfig {
    baseUrl: string;
    apiKey?: string;
    api: 'openai-completions' | 'anthropic-messages' | string;
    models: ModelDefinitionConfig[];
  }
}

declare module 'openclaw/plugin-sdk/provider-onboard' {
  export interface OpenClawConfig {
    agents?: {
      defaults?: {
        model?: string;
        models?: Record<string, unknown>;
      };
    };
    [key: string]: unknown;
  }

  export interface ApplyProviderConfigInput {
    agentModels: Record<string, unknown>;
    providerId: string;
    api: string;
    baseUrl: string;
    catalogModels: unknown[];
  }

  export function applyProviderConfigWithModelCatalog(
    cfg: OpenClawConfig,
    input: ApplyProviderConfigInput,
  ): OpenClawConfig;

  export function applyAgentDefaultModelPrimary(
    cfg: OpenClawConfig,
    modelRef: string,
  ): OpenClawConfig;
}
