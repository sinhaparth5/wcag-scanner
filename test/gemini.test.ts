import { JSDOM } from 'jsdom';
import { getAiSuggestion, getStoredApiKey, setStoredApiKey } from '../src/react/gemini';

describe('gemini helpers', () => {
  const originalFetch = global.fetch;
  const originalLocalStorage = global.localStorage;

  let dom: JSDOM | null = null;

  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://example.org',
    });
    global.localStorage = dom.window.localStorage;
  });

  afterEach(() => {
    dom?.window.close();
    dom = null;
    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
    jest.restoreAllMocks();
  });

  it('parses Gemini HTML code blocks and explanation text', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: '```html\n<img src="logo.png" alt="Company logo">\n```\nUse descriptive alt text.',
            }],
          },
        }],
      }),
    }) as unknown as typeof fetch;

    const result = await getAiSuggestion('test-key', {
      rule: 'img-alt',
      description: 'Image is missing alt text',
      snippet: '<img src="logo.png">',
    });

    expect(result.code).toContain('alt="Company logo"');
    expect(result.explanation).toBe('Use descriptive alt text.');
  });

  it('throws a useful error when Gemini returns a failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden access',
    }) as unknown as typeof fetch;

    await expect(getAiSuggestion('bad-key', { rule: 'img-alt' })).rejects.toThrow('Gemini 403: Forbidden access');
  });

  it('stores and retrieves the API key from localStorage', () => {
    setStoredApiKey('  secret-key  ');

    expect(getStoredApiKey()).toBe('secret-key');
    expect(localStorage.getItem('wcag-gemini-key')).toBe('secret-key');
  });
});
