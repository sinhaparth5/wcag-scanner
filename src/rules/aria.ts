import { ScannerOptions, ScanResults, ElementInfo } from '../types';

/**
 * Accessibility checker for ARIA roles
 */
export default {
    /**
     * Run accessibility checks on ARIA roles
     * @param document DOM document
     * @param window Browser window
     * @param options Scanner options
     * @returns Promise<ScanResults> Results from ARIA role checks
     */
    async check(document: Document, window: Window, options: ScannerOptions): Promise<ScanResults> {
        const results: ScanResults = {
        passes: [],
        violations: [],
        warnings: []
        };

        // Check ARIA roles
        checkAriaRoles(document, results);
        
        // Check required ARIA attributes
        checkRequiredAriaAttributes(document, results);
        
        // Check ARIA states and properties
        checkAriaStatesProperties(document, results);
        
        // Check for overriding native semantics
        checkNativeSemantics(document, results);
        
        return results;
    }
};

/**
 * Check for valid ARIA roles
 * @param document DOM document
 * @param results Scan results
 */
function checkAriaRoles(document: Document, results: ScanResults): void {
  const validRoles = [
    'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell', 'checkbox',
    'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition', 'dialog',
    'directory', 'document', 'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
    'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu',
    'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation', 'none',
    'note', 'option', 'presentation', 'progressbar', 'radio', 'radiogroup', 'region',
    'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
    'slider', 'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
    'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
  ];
  
  // Check all elements with role attributes
  const elementsWithRole = document.querySelectorAll('[role]');
  
  elementsWithRole.forEach(element => {
    const role = element.getAttribute('role');
    
    if (!role) return;
    
    const info: ElementInfo = {
      tagName: element.tagName.toLowerCase(),
      role: role,
      id: element.id || null,
      className: element.className || null
    };
    
    // Check if role is valid
    if (!validRoles.includes(role)) {
      results.violations.push({
        rule: 'aria-role-valid',
        element: info,
        impact: 'serious',
        description: `Invalid ARIA role: "${role}"`,
        snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
        wcag: ['4.1.2'],
        help: `Use only valid ARIA roles. "${role}" is not a valid ARIA role.`
      });
    } else {
      results.passes.push({
        rule: 'aria-role-valid',
        element: info,
        description: `Element has valid ARIA role: "${role}"`
      });
      
      // Check if role is applied to appropriate element
      if (!isRoleAllowedOnElement(element.tagName.toLowerCase(), role)) {
        results.violations.push({
          rule: 'aria-role-compatible',
          element: info,
          impact: 'serious',
          description: `ARIA role "${role}" is not allowed on <${element.tagName.toLowerCase()}> element`,
          snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
          wcag: ['4.1.2'],
          help: `Ensure ARIA roles are used on elements that support them`
        });
      }
    }
  });
}

/**
 * Check for required ARIA attributes
 * @param document DOM document
 * @param results Scan results
 */
function checkRequiredAriaAttributes(document: Document, results: ScanResults): void {
  // Map of roles to their required attributes
  const requiredAttributes: { [key: string]: string[] } = {
    'combobox': ['aria-expanded', 'aria-controls'],
    'slider': ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'],
    'scrollbar': ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-controls'],
    'listbox': ['aria-expanded'],
    'grid': ['aria-level', 'aria-multiselectable'],
    'progressbar': ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'],
    'spinbutton': ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'],
    'tablist': ['aria-orientation']
  };
  
  // Check elements with roles that require specific attributes
  Object.keys(requiredAttributes).forEach(role => {
    const elements = document.querySelectorAll(`[role="${role}"]`);
    
    elements.forEach(element => {
      const info: ElementInfo = {
        tagName: element.tagName.toLowerCase(),
        role: role,
        id: element.id || null
      };
      
      // Check each required attribute
      requiredAttributes[role].forEach(attrName => {
        if (!element.hasAttribute(attrName)) {
          results.violations.push({
            rule: 'aria-required-attr',
            element: info,
            impact: 'serious',
            description: `Element with role="${role}" is missing required attribute: ${attrName}`,
            snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
            wcag: ['4.1.2'],
            help: `Elements with role="${role}" must have ${attrName} attribute`
          });
        }
      });
    });
  });
}

/**
 * Check ARIA states and properties
 * @param document DOM document
 * @param results Scan results
 */
function checkAriaStatesProperties(document: Document, results: ScanResults): void {
  // Valid ARIA states and properties
  const validAriaAttributes = [
    'aria-activedescendant', 'aria-atomic', 'aria-autocomplete', 'aria-busy', 'aria-checked',
    'aria-colcount', 'aria-colindex', 'aria-colspan', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect', 'aria-errormessage',
    'aria-expanded', 'aria-flowto', 'aria-grabbed', 'aria-haspopup', 'aria-hidden',
    'aria-invalid', 'aria-keyshortcuts', 'aria-label', 'aria-labelledby', 'aria-level',
    'aria-live', 'aria-modal', 'aria-multiline', 'aria-multiselectable', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed', 'aria-readonly',
    'aria-relevant', 'aria-required', 'aria-roledescription', 'aria-rowcount', 'aria-rowindex',
    'aria-rowspan', 'aria-selected', 'aria-setsize', 'aria-sort', 'aria-valuemax',
    'aria-valuemin', 'aria-valuenow', 'aria-valuetext'
  ];
  
  // Boolean attributes that must have values "true" or "false"
  const booleanAttributes = [
    'aria-atomic', 'aria-busy', 'aria-disabled', 'aria-expanded', 'aria-grabbed',
    'aria-hidden', 'aria-modal', 'aria-multiline', 'aria-multiselectable', 'aria-pressed',
    'aria-readonly', 'aria-required', 'aria-selected'
  ];
  
  // Find all elements with aria-* attributes
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach(element => {
    // Get all attributes for this element
    const attributes = element.attributes;
    
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      
      // Skip non-aria attributes
      if (!attr.name.startsWith('aria-')) {
        continue;
      }
      
      const info: ElementInfo = {
        tagName: element.tagName.toLowerCase(),
        id: element.id || null,
        attrName: attr.name,
        attrValue: attr.value
      };
      
      // Check if the aria attribute is valid
      if (!validAriaAttributes.includes(attr.name)) {
        results.violations.push({
          rule: 'aria-valid-attr',
          element: info,
          impact: 'serious',
          description: `Invalid ARIA attribute: "${attr.name}"`,
          snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
          wcag: ['4.1.2'],
          help: `Use only valid ARIA attributes. "${attr.name}" is not a valid ARIA attribute.`
        });
      } else {
        results.passes.push({
          rule: 'aria-valid-attr',
          element: info,
          description: `Element has valid ARIA attribute: "${attr.name}"`
        });
        
        // Check boolean attributes have valid values
        if (booleanAttributes.includes(attr.name) && attr.value !== 'true' && attr.value !== 'false') {
          results.violations.push({
            rule: 'aria-boolean-value',
            element: info,
            impact: 'serious',
            description: `ARIA boolean attribute "${attr.name}" must have value "true" or "false", got "${attr.value}"`,
            snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
            wcag: ['4.1.2'],
            help: `Boolean ARIA attributes must have values of either "true" or "false"`
          });
        }
      }
    }
  });
}

/**
 * Check for overriding native semantics with ARIA roles
 * @param document DOM document
 * @param results Scan results
 */
function checkNativeSemantics(document: Document, results: ScanResults): void {
  // Elements with inherent roles that shouldn't be overridden//-
  const elementsWithNativeSemantics: { [key: string]: string[] } = {//-
    'a': ['link'],//+
    'button': ['button'],
    'h1': ['heading'],
    'h2': ['heading'],
    'h3': ['heading'],
    'h4': ['heading'],
    'h5': ['heading'],
    'h6': ['heading'],//-
    'input': [],//+
    'img': ['img'],
    'ul': ['list'],
    'ol': ['list'],
    'li': ['listitem'],
    'nav': ['navigation'],
    'main': ['main'],
    'header': ['banner'],
    'footer': ['contentinfo'],
    'aside': ['complementary'],
    'form': ['form'],
    'table': ['table']
  };

  // Check elements with potentially redundant roles
  Object.keys(elementsWithNativeSemantics).forEach(tagName => {
    const elements = document.querySelectorAll(tagName);

    elements.forEach(element => {
      // Skip if element doesn't have a role
      if (!element.hasAttribute('role')) {
        return;
      }

      const role = element.getAttribute('role');

      // Special handling for input elements (role depends on type)
      if (tagName === 'input') {
        const inputType = (element as HTMLInputElement).type;

        if (
          (inputType === 'button' && role === 'button') ||
          (inputType === 'checkbox' && role === 'checkbox') ||
          (inputType === 'radio' && role === 'radio')
        ) {
          const info: ElementInfo = {
            tagName: 'input',
            type: inputType,
            id: element.id || null,
            role: role || undefined
          };

          results.warnings.push({
            rule: 'aria-redundant-role',
            element: info,
            impact: 'minor',
            description: `Redundant role: <input type="${inputType}"> already has implicit role="${role}"`,
            snippet: element.outerHTML,
            help: `Avoid redundant ARIA roles that match the element's implicit role`
          });
        }

        return;
      }

      // Check other elements against their native semantics//-
      if (role && elementsWithNativeSemantics[tagName].includes(role)) {
        const info: ElementInfo = {
          tagName: tagName,
          id: element.id || null,
          role: role
        };

        results.warnings.push({
          rule: 'aria-redundant-role',
          element: info,
          impact: 'minor',
          description: `Redundant role: <${tagName}> already has implicit role="${role}"`,
          snippet: element.outerHTML,
          help: `Avoid redundant ARIA roles that match the element's implicit role`
        });
      }
    });
  });
}

/**
 * Check if a role is allowed on a specific element
 * @param tagName HTML tag name
 * @param role role to check
 */
function isRoleAllowedOnElement(tagName: string, role: string): boolean {
  // This is a simplified version - a complete implementation would be more complex
  
  // Some common restrictions:
  if (role === 'button' && tagName === 'input') {
    return false; // input should use type="button" instead
  }
  
  if (role === 'heading' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
    return false; // these elements are already headings
  }
  
  if (role === 'link' && tagName === 'a') {
    return false; // a with href is already a link
  }
  
  // Interactive roles are not allowed on non-interactive elements
  const interactiveRoles = ['button', 'checkbox', 'link', 'menuitem', 'menuitemcheckbox', 
                           'menuitemradio', 'option', 'radio', 'slider', 'tab'];
                           
  const nonInteractiveElements = ['div', 'span', 'p', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  
  if (interactiveRoles.includes(role) && nonInteractiveElements.includes(tagName)) {
    return false; // non-interactive elements should not have interactive roles without additional attributes
  }
  
  // By default, assume role is allowed
  return true;
}