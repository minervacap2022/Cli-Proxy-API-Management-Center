import { expect, test } from 'bun:test';
import { COMMAND_CODE_ANTHROPIC_PRESET } from '../src/features/providers/anthropicCompatibilityPresets';

test('Command Code Anthropic preset uses the Messages API base URL and Claude model', () => {
  expect(COMMAND_CODE_ANTHROPIC_PRESET).toEqual({
    name: 'Command Code',
    baseUrl: 'https://api.commandcode.ai/provider/v1',
    testModel: 'claude-sonnet-4-6',
    models: [{ name: 'claude-sonnet-4-6', alias: '' }],
    authType: 'bearer',
  });
});
