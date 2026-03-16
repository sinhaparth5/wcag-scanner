import { ScannerOptions } from '../types';

export const FAST_RULES = ['images', 'contrast', 'forms', 'aria', 'structure', 'keyboard'] as const;
export const FULL_RULES = [...FAST_RULES, 'backgroundImages'] as const;

export function resolveRuleNames(
  options: ScannerOptions,
  fallback: readonly string[] = FAST_RULES,
): string[] {
  if (options.rules && options.rules.length > 0) {
    return options.rules;
  }

  if (options.preset === 'full') {
    return [...FULL_RULES];
  }

  return [...fallback];
}
