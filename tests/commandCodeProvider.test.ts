import { describe, expect, test } from 'bun:test';
import {
  buildCommandCodeProvider,
  COMMAND_CODE_HOST_PROXY_BASE_URL,
  COMMAND_CODE_PROXY_BASE_URL,
  COMMAND_CODE_PROXY_BASE_URLS,
  isCommandCodeAccessKey,
  isCommandCodeProvider,
} from '../src/features/providers/commandCode';

describe('Command Code provider onboarding', () => {
  test('accepts only Command Code user keys', () => {
    expect(isCommandCodeAccessKey('user_example')).toBe(true);
    expect(isCommandCodeAccessKey(' user_example ')).toBe(true);
    expect(isCommandCodeAccessKey('sk-example')).toBe(false);
    expect(isCommandCodeAccessKey('')).toBe(false);
  });

  test('builds a CPA OpenAI-compatible provider from discovered models', () => {
    const provider = buildCommandCodeProvider('user_example', [
      { name: 'gpt-5.6-luna' },
      { name: 'claude-sonnet-5' },
    ]);

    expect(provider).toMatchObject({
      name: 'commandcode',
      protocol: 'openai',
      authType: 'bearer',
      baseUrl: COMMAND_CODE_PROXY_BASE_URL,
      disabled: false,
      apiKeyEntries: [{ apiKey: 'user_example' }],
      models: [
        { name: 'gpt-5.6-luna', alias: 'gpt-5.6-luna' },
        { name: 'claude-sonnet-5', alias: 'claude-sonnet-5' },
      ],
    });
  });

  test('supports both Compose and host-network sidecar endpoints', () => {
    expect(COMMAND_CODE_PROXY_BASE_URLS).toEqual([
      COMMAND_CODE_PROXY_BASE_URL,
      COMMAND_CODE_HOST_PROXY_BASE_URL,
    ]);

    const provider = buildCommandCodeProvider(
      'user_example',
      [{ name: 'gpt-5.6-luna' }],
      undefined,
      COMMAND_CODE_HOST_PROXY_BASE_URL
    );

    expect(provider.baseUrl).toBe(COMMAND_CODE_HOST_PROXY_BASE_URL);
  });

  test('preserves existing settings and does not duplicate a reconnecting key', () => {
    const provider = buildCommandCodeProvider(
      'user_existing',
      [{ name: 'gpt-5.6-luna' }],
      {
        name: 'Command Code',
        baseUrl: 'https://old.example.com/v1',
        prefix: 'cc',
        headers: { 'X-Existing': 'value' },
        apiKeyEntries: [{ apiKey: 'user_existing', weight: 2 }],
        models: [{ name: 'old-model', alias: 'old-model' }],
        disabled: true,
        sourceIndex: 4,
      }
    );

    expect(isCommandCodeProvider(provider)).toBe(true);
    expect(provider).toMatchObject({
      baseUrl: COMMAND_CODE_PROXY_BASE_URL,
      prefix: 'cc',
      headers: { 'X-Existing': 'value' },
      sourceIndex: 4,
      disabled: false,
      apiKeyEntries: [{ apiKey: 'user_existing', weight: 2 }],
      models: [{ name: 'gpt-5.6-luna', alias: 'gpt-5.6-luna' }],
    });
  });
});
