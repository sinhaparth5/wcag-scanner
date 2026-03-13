const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface AiSuggestion {
  code: string;
  explanation: string;
}

export async function getAiSuggestion(
  apiKey: string,
  violation: { rule?: string; description?: string; snippet?: string; help?: string },
): Promise<AiSuggestion> {
  const prompt = [
    'You are a web accessibility expert. A WCAG violation was found:',
    `Rule: ${violation.rule ?? ''}`,
    `Issue: ${violation.description ?? ''}`,
    violation.help ? `Hint: ${violation.help}` : '',
    violation.snippet ? `HTML:\n${violation.snippet}` : '',
    '',
    'Reply with ONLY:',
    '1. The corrected HTML inside a ```html block',
    '2. One sentence explaining the fix',
  ]
    .filter(Boolean)
    .join('\n');

  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 512, temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 120)}`);
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const codeMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1].trim() : '';
  const explanation = text
    .replace(/```(?:html)?\s*[\s\S]*?```/g, '')
    .trim()
    .split('\n')
    .filter(Boolean)
    .slice(-1)[0] ?? 'See corrected code above.';

  return { code, explanation };
}

export function getStoredApiKey(): string {
  try { return localStorage.getItem('wcag-gemini-key') ?? ''; } catch { return ''; }
}

export function setStoredApiKey(key: string): void {
  try { localStorage.setItem('wcag-gemini-key', key.trim()); } catch { /* */ }
}
