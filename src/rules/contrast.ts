import { ScannerOptions, ScanResults, ElementInfo } from '../types';


/**
 * Check accessibility of text elements (contrast, etc.)
 */
export default {
    /**
     * Run text accessibility checks
     * @param document DOM document
     * @param window Browser window
     * @param options Scanner options
     * @returns Promise<ScanResults> Results from text checks
     */
    async check(document: Document, window: Window, options: ScannerOptions): Promise<ScanResults> {
        const results: ScanResults = {
        passes: [],
        violations: [],
        warnings: []
        };
        const backgroundColorCache = new WeakMap<Element, string>();
        const parsedColorCache = new Map<string, { r: number; g: number; b: number } | null>();

        // Minimum contrast requirements by WCAG level
        const contrastRequirements = {
        'A': {
            normalText: 3.0,
            largeText: 3.0
        },
        'AA': {
            normalText: 4.5,
            largeText: 3.0
        },
        'AAA': {
            normalText: 7.0,
            largeText: 4.5
        }
        };

        const level = options.level || 'AA';
        const requirements = contrastRequirements[level] || contrastRequirements.AA;

        // Check text elements for contrast
        const textElements = document.querySelectorAll(
        'p, h1, h2, h3, h4, h5, h6, span, div, a, button, label, li, td, th'
        );

        for (const element of textElements) {
        // Skip empty or hidden elements
        if (!element.textContent?.trim()) {
            continue;
        }

        const style = window.getComputedStyle(element);
        if (isElementHidden(element, style)) {
            continue;
        }

        const textColor = style.color;
        const bgColor = getBackgroundColor(element, window, backgroundColorCache);
        
        // Skip if we couldn't determine colors
        if (!textColor || !bgColor) {
            continue;
        }

        // Determine if text is large according to WCAG
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = style.fontWeight;
        const isLargeText = fontSize >= 24 || (fontSize >= 18.5 && isBoldWeight(fontWeight));
        
        // Get required contrast ratio
        const requiredRatio = isLargeText ? requirements.largeText : requirements.normalText;

        // Calculate contrast ratio
        const contrastRatio = calculateContrastRatio(textColor, bgColor, parsedColorCache);
        
        const info: ElementInfo = {
            tagName: element.tagName.toLowerCase(),
            id: element.id || null,
            className: element.className || null,
            textContent: element.textContent.trim().substring(0, 30) + (element.textContent.trim().length > 30 ? '...' : '')
        };

        if (contrastRatio < requiredRatio) {
            results.violations.push({
            rule: 'color-contrast',
            element: info,
            impact: 'serious',
            description: `Insufficient color contrast ratio: ${contrastRatio.toFixed(2)}:1 (required: ${requiredRatio}:1)`,
            snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
            wcag: level === 'AAA' ? ['1.4.6'] : ['1.4.3'],
            help: `Text elements must have a contrast ratio of at least ${requiredRatio}:1`,
            fix: {
                code: `color: ${textColor}; /* Adjust to achieve ${requiredRatio}:1 contrast ratio against background ${bgColor} */`,
                description: `Increase the contrast between the text color (${textColor}) and background color (${bgColor})`,
                explanation: `The current contrast ratio is ${contrastRatio.toFixed(2)}:1, but should be at least ${requiredRatio}:1`
            }
            });
        } else {
            results.passes.push({
            rule: 'color-contrast',
            element: info,
            description: `Sufficient color contrast ratio: ${contrastRatio.toFixed(2)}:1`
            });
        }
        }

        return results;
    }
};

/**
 * Check if an element is hidden
 * @param element Element to check
 */
function isElementHidden(element: Element, style: CSSStyleDeclaration): boolean {
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return true;
  }
  
  return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
}

function isBoldWeight(fontWeight: string): boolean {
  const numeric = parseInt(fontWeight, 10);
  if (!Number.isNaN(numeric)) return numeric >= 700;
  return fontWeight === 'bold' || fontWeight === 'bolder';
}

/**
 * Get the effective background color of an element
 * @param element Element to check
 * @param window Browser window
 */
function getBackgroundColor(
  element: Element,
  window: Window,
  cache: WeakMap<Element, string>,
): string | null {
  const cached = cache.get(element);
  if (cached) return cached;

  let current = element;
  
  while (current !== null && current.nodeType === 1) {
    const cachedCurrent = cache.get(current);
    if (cachedCurrent) {
      cache.set(element, cachedCurrent);
      return cachedCurrent;
    }

    const style = window.getComputedStyle(current);
    const backgroundColor = style.backgroundColor;
    
    if (backgroundColor && backgroundColor !== 'transparent' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      cache.set(current, backgroundColor);
      cache.set(element, backgroundColor);
      return backgroundColor;
    }
    
    current = current.parentElement as Element;
  }
  
  // If we couldn't find a background color, default to white
  cache.set(element, 'rgb(255, 255, 255)');
  return 'rgb(255, 255, 255)';
}

/**
 * Calculate contrast ratio between two colors
 * @param foreground Foreground color
 * @param background Background color
 */
function calculateContrastRatio(
  foreground: string,
  background: string,
  cache: Map<string, { r: number; g: number; b: number } | null>,
): number {
  const fgRgb = parseColor(foreground, cache);
  const bgRgb = parseColor(background, cache);
  
  if (!fgRgb || !bgRgb) {
    return 0;
  }
  
  const fgLuminance = calculateLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = calculateLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse color string to RGB values
 * @param color Color string
 */
function parseColor(
  color: string,
  cache: Map<string, { r: number; g: number; b: number } | null>,
): { r: number; g: number; b: number } | null {
  const cached = cache.get(color);
  if (cached !== undefined) return cached;

  // Handle 'rgb(r, g, b)' format
  let match = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (match) {
    const parsed = {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    };
    cache.set(color, parsed);
    return parsed;
  }
  
  // Handle 'rgba(r, g, b, a)' format
  match = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/i);
  if (match) {
    const parsed = {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    };
    cache.set(color, parsed);
    return parsed;
  }
  
  // Handle hex format (#RRGGBB)
  match = color.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (match) {
    const parsed = {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16)
    };
    cache.set(color, parsed);
    return parsed;
  }
  
  // Handle shorthand hex format (#RGB)
  match = color.match(/#([0-9a-f])([0-9a-f])([0-9a-f])/i);
  if (match) {
    const parsed = {
      r: parseInt(match[1] + match[1], 16),
      g: parseInt(match[2] + match[2], 16),
      b: parseInt(match[3] + match[3], 16)
    };
    cache.set(color, parsed);
    return parsed;
  }
  
  // Handle common color names
  const colorNames: { [key: string]: { r: number; g: number; b: number } } = {
    black: { r: 0, g: 0, b: 0 },
    white: { r: 255, g: 255, b: 255 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    yellow: { r: 255, g: 255, b: 0 },
    gray: { r: 128, g: 128, b: 128 }
  };
  
  if (colorNames[color.toLowerCase()]) {
    const parsed = colorNames[color.toLowerCase()];
    cache.set(color, parsed);
    return parsed;
  }
  
  cache.set(color, null);
  return null;
}

/**
 * Calculate relative luminance of a color
 * @param r Red component
 * @param g Green component
 * @param b Blue component
 */
function calculateLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values
  const rSrgb = r / 255;
  const gSrgb = g / 255;
  const bSrgb = b / 255;
  
  // Convert to linear RGB
  const rLinear = rSrgb <= 0.03928 ? rSrgb / 12.92 : Math.pow((rSrgb + 0.055) / 1.055, 2.4);
  const gLinear = gSrgb <= 0.03928 ? gSrgb / 12.92 : Math.pow((gSrgb + 0.055) / 1.055, 2.4);
  const bLinear = bSrgb <= 0.03928 ? bSrgb / 12.92 : Math.pow((bSrgb + 0.055) / 1.055, 2.4);
  
  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}
