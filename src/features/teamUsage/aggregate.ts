import type { APIKeyConfig } from '@/services/api/apiKeyConfigs';
import type { TeamUsageRow } from '@/services/api/teamUsage';

export interface TeamModelUsage {
  model: string;
  totalTokens: number;
}

export interface TeamLabelUsage {
  label: string;
  totalTokens: number;
  requests: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  models: TeamModelUsage[];
}

export interface TeamUsageSummary {
  labels: TeamLabelUsage[];
  models: TeamModelUsage[];
  totalTokens: number;
  requests: number;
}

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const labelForKey = (apiKey: string, configs: APIKeyConfig[], index: number): string => {
  const config = configs.find((entry) => entry.key === apiKey);
  return config?.label?.trim() || `API key ${index + 1}`;
};

export const aggregateTeamUsage = (
  rows: TeamUsageRow[],
  configs: APIKeyConfig[]
): TeamUsageSummary => {
  const labelByKey = new Map<string, string>();
  const usageByLabel = new Map<string, TeamLabelUsage>();
  const usageByModel = new Map<string, number>();
  let totalTokens = 0;
  let requests = 0;

  rows.forEach((row) => {
    const apiKey = String(row.api_key ?? '');
    let label = labelByKey.get(apiKey);
    if (!label) {
      label = labelForKey(apiKey, configs, labelByKey.size);
      labelByKey.set(apiKey, label);
    }

    let usage = usageByLabel.get(label);
    if (!usage) {
      usage = {
        label,
        totalTokens: 0,
        requests: 0,
        failed: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cachedTokens: 0,
        models: [],
      };
      usageByLabel.set(label, usage);
    }

    const model = String(row.model ?? '').trim() || 'Unknown model';
    const rowTokens = asNumber(row.total_tokens);
    usage.totalTokens += rowTokens;
    usage.requests += asNumber(row.requests);
    usage.failed += asNumber(row.failed);
    usage.inputTokens += asNumber(row.input_tokens);
    usage.outputTokens += asNumber(row.output_tokens);
    usage.reasoningTokens += asNumber(row.reasoning_tokens);
    usage.cachedTokens += asNumber(row.cached_tokens);
    totalTokens += rowTokens;
    requests += asNumber(row.requests);

    const existingModel = usage.models.find((entry) => entry.model === model);
    if (existingModel) existingModel.totalTokens += rowTokens;
    else usage.models.push({ model, totalTokens: rowTokens });
    usageByModel.set(model, (usageByModel.get(model) ?? 0) + rowTokens);
  });

  const byTokens = <T extends { totalTokens: number }>(left: T, right: T) =>
    right.totalTokens - left.totalTokens;
  const labels = Array.from(usageByLabel.values()).map((usage) => ({
    ...usage,
    models: [...usage.models].sort(byTokens),
  }));

  return {
    labels: labels.sort(byTokens),
    models: Array.from(usageByModel, ([model, modelTokens]) => ({
      model,
      totalTokens: modelTokens,
    })).sort(byTokens),
    totalTokens,
    requests,
  };
};
