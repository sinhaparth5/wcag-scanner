import { ScannerOptions, ScanResults, ElementInfo } from '../types';

/**
 * Accessibility checker for tab index, keyboard events, focus indicators, and interactive elements
 */
export default {
    /**
     * Run accessibility checks on tab index, keyboard events, focus indicators, and interactive elements
     * @param document DOM document
     * @param window Browser window
     * @param options Scanner options
     * @returns Promise<ScanResults> Results from accessibility checks
     */
    async check(document: Document, window: Window, options: ScannerOptions): Promise<ScanResults> {
        const results: ScanResults = {
        passes: [],
        violations: [],
        warnings: []
        };

        // Check tabindex values
        checkTabindex(document, results);
        
        // Check keyboard event handlers
        checkKeyboardEvents(document, results);
        
        // Check focus indicators
        checkFocusIndicators(document, window, results);
        
        // Check interactive elements
        checkInteractiveElements(document, results);
        
        return results;
  }
};

/**
 * Check for valid tabindex values
 * @param document DOM document
 * @param results Scan results
 */
function checkTabindex(document: Document, results: ScanResults): void {
  const elements = document.querySelectorAll('[tabindex]');
  
  elements.forEach(element => {
    const tabindex = element.getAttribute('tabindex');
    const tabindexNum = parseInt(tabindex || '0');
    
    const info: ElementInfo = {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      tabindex: tabindex || null
    };
    
    // Check for positive tabindex values (creates a custom tab order)
    if (tabindexNum > 0) {
      results.warnings.push({
        rule: 'tabindex-positive',
        element: info,
        impact: 'moderate',
        description: `Element has a positive tabindex value (${tabindexNum})`,
        snippet: element.outerHTML,
        wcag: ['2.4.3'],
        help: 'Avoid positive tabindex values as they create a custom tab order'
      });
    }
    
    // Check if non-interactive elements are focusable
    const isNativelyFocusable = [
      'a', 'button', 'input', 'select', 'textarea', 'summary', 'details'
    ].includes(element.tagName.toLowerCase());
    
    const hasInteractiveRole = element.hasAttribute('role') && [
      'button', 'checkbox', 'link', 'menuitem', 'menuitemcheckbox',
      'menuitemradio', 'option', 'radio', 'slider', 'tab', 'textbox',
      'switch', 'searchbox', 'combobox'
    ].includes(element.getAttribute('role') || '');
    
    if (!isNativelyFocusable && !hasInteractiveRole && tabindexNum >= 0) {
      results.warnings.push({
        rule: 'tabindex-non-interactive',
        element: info,
        impact: 'moderate',
        description: 'Non-interactive element has a tabindex making it focusable',
        snippet: element.outerHTML,
        wcag: ['2.1.1'],
        help: 'Only make interactive elements focusable or add appropriate ARIA roles'
      });
    }
  });
}

/**
 * Check keyboard event handlers
 * @param document DOM document
 * @param results Scan results
 */
function checkKeyboardEvents(document: Document, results: ScanResults): void {
  // Elements with mouse event handlers but no keyboard equivalent
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach(element => {
    // This is a simple check - a full implementation would analyze event handlers
    // through JavaScript frameworks, which is complex
    
    const hasOnClick = element.hasAttribute('onclick');
    const hasOnMousedown = element.hasAttribute('onmousedown');
    const hasOnMouseup = element.hasAttribute('onmouseup');
    
    const hasOnKeydown = element.hasAttribute('onkeydown');
    const hasOnKeyup = element.hasAttribute('onkeyup');
    const hasOnKeypress = element.hasAttribute('onkeypress');
    
    const info: ElementInfo = {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      className: element.className || null
    };
    
    // Check if element has mouse event but no keyboard event
    if ((hasOnClick || hasOnMousedown || hasOnMouseup) && 
        !(hasOnKeydown || hasOnKeyup || hasOnKeypress)) {
      
      // Skip natively clickable elements (browsers handle keyboard events)
      if (['a', 'button', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase())) {
        return;
      }
      
      results.warnings.push({
        rule: 'keyboard-event-equivalents',
        element: info,
        impact: 'moderate',
        description: 'Element has mouse event handlers but no keyboard event handlers',
        snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
        wcag: ['2.1.1'],
        help: 'Ensure all functionality is operable through keyboard'
      });
    }
  });
}

/**
 * Check for focus indicators
 * @param document DOM document
 * @param window Browser window
 * @param results Scan results
 */
function checkFocusIndicators(document: Document, window: Window, results: ScanResults): void {
  // Elements that should have visible focus indicators
  const focusableElements = document.querySelectorAll(
    'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
  );
  
  focusableElements.forEach(element => {
    // Without actually applying focus, we can't check the exact appearance
    // But we can check for CSS that might suppress focus styles
    
    const style = window.getComputedStyle(element);
    
    const info: ElementInfo = {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      className: element.className || null
    };
    
    // Check for CSS that might remove the focus outline
    if (style.outlineStyle === 'none' || style.outlineWidth === '0px') {
      // Look for alternative focus indicators like background-color changes or borders
      // This is a simplified check
      
      results.warnings.push({
        rule: 'focus-visible',
        element: info,
        impact: 'moderate',
        description: 'Element may be missing visible focus indicator',
        snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
        wcag: ['2.4.7'],
        help: 'Ensure all focusable elements have visible focus indicators'
      });
    }
  });
}

/**
 * Check interactive elements
 * @param document DOM document
 * @param results Scan results
 */
function checkInteractiveElements(document: Document, results: ScanResults): void {
  // Check for non-button elements that act as buttons
  const clickableItems = document.querySelectorAll('div[onclick], span[onclick], a:not([href])');
  
  clickableItems.forEach(element => {
    const info: ElementInfo = {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      className: element.className || null
    };
    
    // Check for button role
    const hasButtonRole = element.getAttribute('role') === 'button';
    
    // Check for interactivity properties
    const isInteractive = element.hasAttribute('tabindex') ||
                          element.hasAttribute('onclick') ||
                          element.hasAttribute('onkeyup') ||
                          element.hasAttribute('onkeydown');
    
    if (isInteractive && !hasButtonRole && element.tagName.toLowerCase() !== 'button') {
      results.violations.push({
        rule: 'interactive-semantics',
        element: info,
        impact: 'serious',
        description: 'Interactive element is missing semantic role',
        snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
        wcag: ['4.1.2'],
        help: 'Add role="button" to non-button elements that act as buttons'
      });
    }
    
    // Check if interactive elements are focusable
    if (isInteractive && !element.hasAttribute('tabindex') && element.tagName.toLowerCase() !== 'a') {
      results.violations.push({
        rule: 'interactive-focusable',
        element: info,
        impact: 'serious',
        description: 'Interactive element is not keyboard focusable',
        snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
        wcag: ['2.1.1'],
        help: 'Add tabindex="0" to make interactive elements focusable'
      });
    }
  });
  
  // Check for links that open in new windows
  const linksNewWindow = document.querySelectorAll('a[target="_blank"]');
  
  linksNewWindow.forEach(link => {
    const info: ElementInfo = {
      tagName: 'a',
      id: link.id || null,
      href: link.getAttribute('href') || null,
      target: '_blank'
    };
    
    const hasWarning = link.textContent?.toLowerCase().includes('new window') ||
                        link.textContent?.toLowerCase().includes('new tab') ||
                        link.querySelector('svg, img[alt*="new window"], img[alt*="external"]');
    
    if (!hasWarning) {
      results.warnings.push({
        rule: 'link-new-window',
        element: info,
        impact: 'moderate',
        description: 'Link opens in new window without warning',
        snippet: link.outerHTML,
        wcag: ['3.2.2'],
        help: 'Indicate in the link text that it opens in a new window'
      });
    }
  });
}