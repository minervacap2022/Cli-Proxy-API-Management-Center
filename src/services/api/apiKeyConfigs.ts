/**
 * Per-API-Key config management
 */

import { apiClient } from './client';

export interface APIKeyConfig {
  key: string;
  label?: string;
  'allowed-models'?: string[];
  'model-group'?: string;
}

export const apiKeyConfigsApi = {
  async list(): Promise<APIKeyConfig[]> {
    const data = await apiClient.get<Record<string, unknown>>('/api-key-configs');
    const configs = data['api-key-configs'];
    return Array.isArray(configs) ? (configs as APIKeyConfig[]) : [];
  },

  upsert: (value: APIKeyConfig) => apiClient.patch('/api-key-configs', { value }),

  delete: (key: string) => apiClient.delete(`/api-key-configs?key=${encodeURIComponent(key)}`),
};
