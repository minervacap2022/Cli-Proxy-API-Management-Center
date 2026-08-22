import { describe, expect, test } from 'bun:test';
import { buildClaudeMessagesEndpoint } from '../src/components/providers/utils';
import { openaiToResource } from '../src/features/providers/adapters';
import { PROVIDER_BRAND_ORDER } from '../src/features/providers/descriptors';
import { buildCompatibilityProbeRequest } from '../src/features/providers/sheets/forms/useConnectivityTest';
import { normalizeOpenAIProvider } from '../src/services/api/transformers';

describe('Anthropic-compatible providers', () => {
  test('normalizes the explicit Anthropic protocol and x-api-key auth type', () => {
    const provider = normalizeOpenAIProvider({
      name: 'command-code',
      protocol: 'anthropic',
      'auth-type': 'x-api-key',
      'base-url': 'https://api.commandcode.ai/provider/v1',
      'api-key-entries': [{ 'api-key': 'not-a-real-key' }],
      models: [{ name: 'claude-command-code' }],
    });

    expect(provider).toMatchObject({
      name: 'command-code',
      protocol: 'anthropic',
      authType: 'x-api-key',
      baseUrl: 'https://api.commandcode.ai/provider/v1',
    });
  });

  test('keeps legacy compatibility providers on OpenAI bearer defaults', () => {
    const provider = normalizeOpenAIProvider({
      name: 'legacy',
      'base-url': 'https://legacy.example/v1',
    });

    expect(provider).toMatchObject({ protocol: 'openai', authType: 'bearer' });
  });

  test('builds the Command Code Anthropic Messages endpoint without changing its provider path', () => {
    expect(buildClaudeMessagesEndpoint('https://api.commandcode.ai/provider/v1')).toBe(
      'https://api.commandcode.ai/provider/v1/messages'
    );
    expect(buildClaudeMessagesEndpoint('https://api.commandcode.ai/provider/v1/messages')).toBe(
      'https://api.commandcode.ai/provider/v1/messages'
    );
  });

  test('builds a valid Anthropic Messages connection probe with x-api-key auth', () => {
    const probe = buildCompatibilityProbeRequest({
      baseUrl: 'https://api.commandcode.ai/provider/v1',
      protocol: 'anthropic',
      authType: 'x-api-key',
      model: 'claude-command-code',
      apiKey: 'not-a-real-key',
      formHeaders: [],
    });

    expect(probe).toEqual({
      url: 'https://api.commandcode.ai/provider/v1/messages',
      header: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': 'not-a-real-key',
      },
      data: JSON.stringify({
        model: 'claude-command-code',
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
  });

  test('places Anthropic records in their dedicated workbench family', () => {
    const provider = normalizeOpenAIProvider({
      name: 'command-code',
      protocol: 'anthropic',
      'base-url': 'https://api.commandcode.ai/provider/v1',
    });
    if (!provider) throw new Error('provider should normalize');

    const resource = openaiToResource(provider, 3, 'anthropicCompatibility');
    expect(resource.brand).toBe('anthropicCompatibility');
    expect(resource.selector).toEqual({
      brand: 'anthropicCompatibility',
      name: 'command-code',
      index: 3,
    });
    expect(PROVIDER_BRAND_ORDER).toContain('anthropicCompatibility');
  });
});
