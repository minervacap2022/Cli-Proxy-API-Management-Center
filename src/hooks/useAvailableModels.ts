import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { useModelsStore } from '@/stores/useModelsStore';
import { apiKeysApi } from '@/services/api/apiKeys';

/**
 * Returns the list of model names available on the connected proxy server.
 * Reuses the cached result from useModelsStore if already populated.
 */
export function useAvailableModels(): string[] {
  const apiBase = useAuthStore((state) => state.apiBase);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const config = useConfigStore((state) => state.config);

  const models = useModelsStore((state) => state.models);
  const fetchModels = useModelsStore((state) => state.fetchModels);
  const isCacheValid = useModelsStore((state) => state.isCacheValid);

  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (connectionStatus !== 'connected' || !apiBase || fetched) return;
    if (isCacheValid(apiBase)) {
      setFetched(true);
      return;
    }

    setFetched(true);

    const run = async () => {
      try {
        // Try config keys first (already in memory), fall back to API call
        const configKeys: string[] = Array.isArray(config?.apiKeys)
          ? (config.apiKeys as unknown[]).map(String).filter(Boolean)
          : [];
        const primaryKey = configKeys[0] ?? (await apiKeysApi.list())[0] ?? '';
        await fetchModels(apiBase, primaryKey);
      } catch {
        // Non-critical — autocomplete just won't show suggestions
      }
    };

    run();
  }, [connectionStatus, apiBase, config?.apiKeys, fetched, isCacheValid, fetchModels]);

  return models.map((m) => m.name).filter(Boolean);
}
