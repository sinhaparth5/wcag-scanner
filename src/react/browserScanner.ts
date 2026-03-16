import { ScannerOptions, ScanResults, Violation, Warning, Pass } from '../types';
import imagesRule from '../rules/images';
import contrastRule from '../rules/contrast';
import formsRule from '../rules/forms';
import ariaRule from '../rules/aria';
import structureRule from '../rules/structure';
import keyboardRule from '../rules/keyboard';

export interface AnnotatedViolation extends Violation {
  domElement?: Element;
  elementPath?: string;
  /** Precise nth-child CSS selector — use for querySelector to find element */
  elementSelector?: string;
}

export interface AnnotatedWarning extends Warning {
  domElement?: Element;
  elementPath?: string;
  elementSelector?: string;
}

export interface BrowserScanResults {
  violations: AnnotatedViolation[];
  warnings: AnnotatedWarning[];
  passes: Pass[];
  duration: number;
}

const RULES: Record<string, { check: (d: Document, w: Window, o: ScannerOptions) => Promise<ScanResults> }> = {
  images: imagesRule,
  contrast: contrastRule,
  forms: formsRule,
  aria: ariaRule,
  structure: structureRule,
  keyboard: keyboardRule,
};

export async function scanBrowserPage(options: ScannerOptions = {}): Promise<BrowserScanResults> {
  const start = performance.now();
  const ruleNames = options.rules || Object.keys(RULES);
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const passes: Pass[] = [];
  const overlayRoot = document.querySelector('[data-wcag-overlay-root="true"]');
  const overlayParent = overlayRoot?.parentNode ?? null;
  const overlayNextSibling = overlayRoot?.nextSibling ?? null;

  try {
    // Detach the dev overlay while scanning so the inspector never scans itself.
    if (overlayRoot && overlayParent) {
      overlayParent.removeChild(overlayRoot);
    }

    for (const name of ruleNames) {
      const rule = RULES[name];
      if (!rule) continue;
      try {
        const res = await rule.check(document, window as unknown as Window, options);
        violations.push(...(res.violations || []));
        warnings.push(...(res.warnings || []));
        passes.push(...(res.passes || []));
      } catch {
        // rule failed in browser context — skip silently
      }
    }
  } finally {
    if (overlayRoot && overlayParent) {
      overlayParent.insertBefore(overlayRoot, overlayNextSibling);
    }
  }

  // Exclude elements that live inside the WCAG overlay itself
  const overlaySurface = document.querySelector('[data-wcag-overlay="true"]');
  const isInOverlay = (el: Element | null): boolean =>
    el != null && (
      (overlaySurface != null && overlaySurface.contains(el)) ||
      (overlayRoot != null && overlayRoot.contains(el))
    );

  const annotate = <T extends Violation | Warning>(item: T): T & {
    domElement?: Element;
    elementPath?: string;
    elementSelector?: string;
  } => {
    const el = findElement(item, document);
    if (!el) return { ...item };
    return {
      ...item,
      domElement: el,
      elementPath: getElementPath(el),
      elementSelector: getNthChildSelector(el),
    };
  };

  return {
    violations: dedupeIssues(violations.map(annotate)).filter(v => !isInOverlay(v.domElement ?? null)),
    warnings: dedupeIssues(warnings.map(annotate)).filter(w => !isInOverlay(w.domElement ?? null)),
    passes: dedupePasses(passes),
    duration: Math.round(performance.now() - start),
  };
}

function dedupeIssues<T extends Violation | Warning>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = [
      item.rule,
      item.description,
      item.impact,
      item.snippet,
      item.element?.tagName,
      item.element?.id,
      item.element?.className,
    ].join('::');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupePasses(items: Pass[]): Pass[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = [item.rule, item.description].join('::');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Build a precise nth-child CSS selector path for an element.
 * This is unambiguous and always finds the exact element.
 */
export function getNthChildSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === 1) {
    const parent: Element | null = current.parentElement;
    if (!parent) break;

    // If element has a unique ID we can stop traversing early
    const id = (current as HTMLElement).id;
    if (id) {
      parts.unshift(`#${CSS.escape(id)}`);
      break;
    }

    const index = Array.from(parent.children).indexOf(current) + 1;
    parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
    current = parent;

    if (parts.length >= 8) break;
  }

  return parts.join(' > ');
}

/** Build a human-readable breadcrumb label for an element. */
export function getElementPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current.tagName && current !== document.body && parts.length < 5) {
    let part = current.tagName.toLowerCase();

    if (current.id) {
      part += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter(c => c.length > 0 && c.length < 20 && !/^[a-z0-9]{8,}$/.test(c))
        .slice(0, 2);
      if (classes.length) part += `.${classes.join('.')}`;
    }

    parts.unshift(part);
    current = current.parentElement;
  }

  return parts.join(' › ');
}

function findElement(item: Violation | Warning, doc: Document): Element | null {
  const { element: info, snippet } = item;

  // 1. ID — most reliable
  if (info?.id) {
    const el = doc.getElementById(info.id);
    if (el) return el;
  }

  // 2. Snippet attribute matching
  if (snippet) {
    const el = findBySnippet(snippet, doc);
    if (el) return el;
  }

  // 3. tagName + className
  if (info?.tagName) {
    try {
      const classes = info.className?.trim().split(/\s+/).filter(Boolean) ?? [];
      const selector = classes.length ? `${info.tagName}.${classes.join('.')}` : info.tagName;
      const el = doc.querySelector(selector);
      if (el) return el;
    } catch {
      // invalid selector — skip
    }
  }

  return null;
}

function findBySnippet(snippet: string, doc: Document): Element | null {
  const tagMatch = snippet.match(/^<([\w-]+)([\s\S]*?)(?:\s*\/?>)/);
  if (!tagMatch) return null;

  const tagName = tagMatch[1].toLowerCase();
  const attrStr = tagMatch[2];

  const tryQuery = (sel: string): Element | null => {
    try { return doc.querySelector(sel); } catch { return null; }
  };

  const idMatch = attrStr.match(/\bid="([^"]*)"/);
  if (idMatch) return doc.getElementById(idMatch[1]);

  const srcMatch = attrStr.match(/\bsrc="([^"]*)"/);
  if (srcMatch) {
    const el = tryQuery(`${tagName}[src="${CSS.escape(srcMatch[1])}"]`);
    if (el) return el;
  }

  const hrefMatch = attrStr.match(/\bhref="([^"]*)"/);
  if (hrefMatch) {
    const el = tryQuery(`${tagName}[href="${CSS.escape(hrefMatch[1])}"]`);
    if (el) return el;
  }

  const nameMatch = attrStr.match(/\bname="([^"]*)"/);
  if (nameMatch) {
    const el = tryQuery(`${tagName}[name="${CSS.escape(nameMatch[1])}"]`);
    if (el) return el;
  }

  const classMatch = attrStr.match(/\bclass="([^"]*)"/);
  if (classMatch) {
    const classes = classMatch[1].trim().split(/\s+/).filter(Boolean);
    if (classes.length) {
      const el = tryQuery(`${tagName}.${classes.join('.')}`);
      if (el) return el;
    }
  }

  return doc.querySelector(tagName);
}
