import { apiClient } from './client';

export interface TeamUsageRow {
  api_key: string;
  model: string;
  requests: number;
  failed: number;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cached_tokens: number;
  total_tokens: number;
}

interface TeamUsageResponse {
  rows?: TeamUsageRow[];
}

export const teamUsageApi = {
  async getSummary(start?: Date, end?: Date): Promise<TeamUsageRow[]> {
    const params = new URLSearchParams();
    if (start) params.set('start', start.toISOString());
    if (end) params.set('end', end.toISOString());
    const query = params.size > 0 ? `?${params.toString()}` : '';
    const response = await apiClient.get<TeamUsageResponse>(`/usage/summary${query}`);
    return Array.isArray(response.rows) ? response.rows : [];
  },
};
