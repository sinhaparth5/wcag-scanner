import { ScannerOptions, ScanResults, ElementInfo } from '../types';

/**
 * Check CSS background images for potentially meaningful content that lacks text alternatives.
 */
export default {
  async check(document: Document, window: Window, _options: ScannerOptions): Promise<ScanResults> {
    const results: ScanResults = {
      passes: [],
      violations: [],
      warnings: []
    };

    checkBackgroundImages(document, window, results);
    return results;
  }
};

function checkBackgroundImages(document: Document, window: Window, results: ScanResults): void {
  const root = document.body ?? document.documentElement;
  if (!root) return;

  const walker = document.createTreeWalker(root, 1);
  let current = walker.currentNode as Element | null;

  while (current) {
    const element = current;

    if (!shouldInspectBackgroundImage(element)) {
      current = walker.nextNode() as Element | null;
      continue;
    }

    const style = window.getComputedStyle(element);
    const backgroundImage = style.backgroundImage;

    if (!backgroundImage || backgroundImage === 'none') {
      current = walker.nextNode() as Element | null;
      continue;
    }

    if (isElementHidden(element, window) || element.getAttribute('aria-hidden') === 'true') {
      current = walker.nextNode() as Element | null;
      continue;
    }

    const info: ElementInfo = {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      className: element.className?.toString() || null,
      textContent: element.textContent?.substring(0, 50) || null
    };

    const hasTextContent = element.textContent?.trim() !== '';
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledby = element.hasAttribute('aria-labelledby');
    const hasTitle = element.hasAttribute('title');

    if (!hasTextContent && !hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
      if (backgroundImage.includes('url(') && !isBackgroundLikelyDecorative(element)) {
        results.warnings.push({
          rule: 'background-image',
          element: info,
          impact: 'moderate',
          description: 'Element with background image may need text alternative',
          snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
          wcag: ['1.1.1'],
          help: 'If the background image conveys meaning, add text alternative via aria-label or text content'
        });
      }
    }

    current = walker.nextNode() as Element | null;
  }
}

function isElementHidden(element: Element, window: Window): boolean {
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return true;
  }

  try {
    const style = window.getComputedStyle(element);
    return style.display === 'none' || style.visibility === 'hidden';
  } catch {
    return false;
  }
}

function shouldInspectBackgroundImage(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();

  if (['script', 'style', 'link', 'meta', 'head', 'title', 'base', 'noscript'].includes(tagName)) {
    return false;
  }

  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  if (element.hasAttribute('style')) {
    const inlineStyle = (element.getAttribute('style') || '').toLowerCase();
    if (inlineStyle.includes('background')) return true;
  }

  if (element.hasAttribute('title') || element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')) {
    return true;
  }

  if (element.childElementCount === 0 && element.textContent?.trim()) {
    return true;
  }

  return ['div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'figure', 'a', 'button'].includes(tagName);
}

function isBackgroundLikelyDecorative(element: Element): boolean {
  const decorativeElements = ['header', 'footer', 'section', 'article', 'div'];
  const tagName = element.tagName?.toLowerCase() || '';

  if (decorativeElements.includes(tagName)) {
    const className = element.className?.toString() || '';
    if (
      className.includes('background') ||
      className.includes('banner') ||
      className.includes('hero') ||
      className.includes('container') ||
      className.includes('wrapper') ||
      className.includes('section')
    ) {
      return true;
    }
  }

  return false;
}
