/**
 * Model group management
 */

import { apiClient } from './client';

export interface ModelGroupEntry {
  model: string;
  priority: number;
}

export interface ModelGroup {
  name: string;
  models: ModelGroupEntry[];
}

export const modelGroupsApi = {
  async list(): Promise<ModelGroup[]> {
    const data = await apiClient.get<Record<string, unknown>>('/model-groups');
    const groups = data['model-groups'];
    return Array.isArray(groups) ? (groups as ModelGroup[]) : [];
  },

  upsert: (value: ModelGroup) => apiClient.patch('/model-groups', { value }),

  delete: (name: string) => apiClient.delete(`/model-groups?name=${encodeURIComponent(name)}`),
};
