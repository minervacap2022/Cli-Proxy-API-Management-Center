import type { ModelEntryInput } from './types';

export const COMMAND_CODE_ANTHROPIC_PRESET = {
  name: 'Command Code',
  baseUrl: 'https://api.commandcode.ai/provider/v1',
  testModel: 'claude-sonnet-4-6',
  models: [{ name: 'claude-sonnet-4-6', alias: '' }] satisfies ModelEntryInput[],
  authType: 'bearer' as const,
};
