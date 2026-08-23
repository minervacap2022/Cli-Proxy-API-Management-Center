import type { ModelInfo } from '@/utils/models';
import type { OpenAIProviderConfig } from '@/types';

export const COMMAND_CODE_PROVIDER_NAME = 'commandcode';
export const COMMAND_CODE_PROXY_BASE_URL = 'http://commandcode-proxy:3050/v1';
export const COMMAND_CODE_HOST_PROXY_BASE_URL = 'http://127.0.0.1:3050/v1';
export const COMMAND_CODE_PROXY_BASE_URLS = [
  COMMAND_CODE_PROXY_BASE_URL,
  COMMAND_CODE_HOST_PROXY_BASE_URL,
] as const;

export const normalizeCommandCodeAccessKey = (value: string): string => value.trim();

export const isCommandCodeAccessKey = (value: string): boolean =>
  /^user_[A-Za-z0-9_-]+$/.test(normalizeCommandCodeAccessKey(value));

export const isCommandCodeProvider = (
  provider: OpenAIProviderConfig | undefined | null
): boolean => {
  if (!provider) return false;
  return provider.name.trim().toLowerCase() === COMMAND_CODE_PROVIDER_NAME;
};

const normalizeModels = (models: ModelInfo[]) => {
  const seen = new Set<string>();
  return models.flatMap((model) => {
    const name = model.name.trim();
    if (!name || seen.has(name)) return [];
    seen.add(name);
    return [{ name, alias: name }];
  });
};

export const buildCommandCodeProvider = (
  accessKey: string,
  models: ModelInfo[],
  existing?: OpenAIProviderConfig,
  baseUrl = COMMAND_CODE_PROXY_BASE_URL
): OpenAIProviderConfig => {
  const normalizedAccessKey = normalizeCommandCodeAccessKey(accessKey);
  const existingEntries = existing?.apiKeyEntries ?? [];
  const hasAccessKey = existingEntries.some((entry) => entry.apiKey === normalizedAccessKey);

  return {
    ...(existing ?? {}),
    name: COMMAND_CODE_PROVIDER_NAME,
    protocol: 'openai',
    authType: 'bearer',
    baseUrl,
    apiKeyEntries: hasAccessKey
      ? existingEntries
      : [...existingEntries, { apiKey: normalizedAccessKey }],
    models: normalizeModels(models),
    disabled: false,
  };
};
