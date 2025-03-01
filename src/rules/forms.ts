import { ScannerOptions, ScanResults, ElementInfo } from "../types";

/**
 * Check form accessibility (labels, etc.)
 */
export default {
    /**
     * Run form accessibility checks
     * @param document DOM document
     * @param window Browser window
     * @param options Scanner options
     * @returns Promise<ScanResults> Results from form checks
     */
    async check(document: Document, window: Window, options: ScannerOptions): Promise<ScanResults> {
        const results: ScanResults = {
            passes: [],
            violations: [],
            warnings: []
        };

        // Check input elements for labels
        checkInputLabels(document, results);

        // Check required attributes and ARIA
        checkRequiredAttributes(document, results);

        // Check form accessibility
        checkFormAccessibility(document, results);

        // Check validation and error messages
        checkFormValidation(document, results);

        return results;

    }
}

/**
 * Check input elements for labels
 * @param document DOM document
 * @param results Scan results
 */
function checkInputLabels(document: Document, results: ScanResults): void {
    // Get all form control elements that need labels
    const formControls = document.querySelectorAll(
        'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]), select, textarea'
    );

    formControls.forEach(control => {
        const info: ElementInfo = {
            tagName: control.tagName.toLowerCase(),
            type: (control as HTMLInputElement).type || null,
            id: control.id || null,
            name: control.getAttribute('name') || null
        };

        // Skip if in a hidden container
        if (isElementHidden(control)) {
            return;
        }

        // Check for accessibility name
        const hasExplicitLabel = control.id && document.querySelector(`label[for="${control.id}]`);
        const hasWrappingLabel = control.closest('label');
        const hasAriaLabel = control.hasAttribute('aria-label');
        const hasAriaLabelledby = control.hasAttribute('aria-labelledby');
        const hasTitle = control.hasAttribute('title');

        if (!hasExplicitLabel && !hasWrappingLabel && !hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
            // Form control has no  accessible name
            results.violations.push({
                rule: 'form-label',
                element: info,
                description: 'Form control does not have a label',
                snippet: control.outerHTML,
                wcag: ['1.3.1', '2.4.6', '3.3.2', '4.1.2'],
                help: 'Each form control mush have a label',
                helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-and-instructions.html',
                impact: "critical"
            });
        } else if (hasExplicitLabel || hasWrappingLabel) {
            results.passes.push({
                rule: 'form-label',
                element: info,
                description: 'Form control has proper label element',
                snippet: control.outerHTML
            });
        } else {
            results.passes.push({
                rule: 'form-label-alternative',
                element: info,
                description: 'Form control has alternative labelling method',
                snippet: control.outerHTML
            });
        }

        // Check placeholder as label issue
        if (control.hasAttribute('placeholder') && !hasExplicitLabel && !hasWrappingLabel && !hasAriaLabel && !hasAriaLabelledby) {
            results.warnings.push({
                rule: 'placeholder-label',
                element: info,
                impact: 'serious',
                description: 'Placeholder is being used instead of a label',
                snippet: control.outerHTML,
                wcag: ['1.3.1', '3.3.2'],
                help: 'Placeholders should not be used as replacement for labels'
            });
        }
    });
}

/**
 * Check for required attributes on form elements
 * @param document DOM document
 * @param results Scan results
 */
function checkRequiredAttributes(document: Document, results: ScanResults): void {
    const selects = document.querySelectorAll('.select');

    selects.forEach(select => {
        const info: ElementInfo = {
            tagName: 'select',
            id: select.id || null,
            name: select.getAttribute('name') || null
        };

        if (select.querySelectorAll('option').length === 0) {
            results.violations.push({
                rule: 'select-options',
                element: info,
                impact: 'critical',
                description: 'Select element has no options',
                snippet: select.outerHTML,
                wcag: ['4.1.2'],
                help: 'Select elements must contain option elements'
            });
        } else {
            results.passes.push({
                rule:'select-options',
                element: info,
                description: 'Select element has options',
                snippet: select.outerHTML
            });
        }
    });

    // Check fieldsets for legends
    const fieldsets = document.querySelectorAll('fieldset');

    fieldsets.forEach(fieldset => {
        const info: ElementInfo = {
            tagName: 'fieldset',
            id: fieldset.id || null
        };

        const legend = fieldset.querySelector('legend');
    
        if (!legend) {
            results.violations.push({
                rule: 'fieldset-legend',
                element: info,
                impact: 'serious',
                description: 'Fieldset does not have a legend',
                snippet: fieldset.outerHTML.slice(0, 150) + (fieldset.outerHTML.length > 150 ? '...' : ''),
                wcag: ['1.3.1', '3.3.2'],
                help: 'Fieldsets must have a legend that describes the group'
            });
            } else if (!legend.textContent?.trim()) {
            results.violations.push({
                rule: 'fieldset-legend-empty',
                element: info,
                impact: 'serious',
                description: 'Fieldset has an empty legend',
                snippet: fieldset.outerHTML.slice(0, 150) + (fieldset.outerHTML.length > 150 ? '...' : ''),
                wcag: ['1.3.1', '3.3.2'],
                help: 'Legends must contain descriptive text'
            });
            } else {
            results.passes.push({
                rule: 'fieldset-legend',
                element: info,
                description: 'Fieldset has a legend',
                snippet: fieldset.outerHTML.slice(0, 150) + (fieldset.outerHTML.length > 150 ? '...' : '')
            });
        }
    });
}

/**
 * Check overall form accessibility
 * @param document DOM document
 * @param results Scan results
 */
function checkFormAccessibility(document: Document, results: ScanResults): void {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const info: ElementInfo = {
        tagName: 'form',
        id: form.id || null,
        name: form.getAttribute('name') || null
      };
      
      // Check for submit button
      const hasSubmitButton = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
      
      if (!hasSubmitButton) {
        results.warnings.push({
          rule: 'form-submit',
          element: info,
          impact: 'moderate',
          description: 'Form does not have an explicit submit button',
          snippet: form.outerHTML.slice(0, 150) + (form.outerHTML.length > 150 ? '...' : ''),
          wcag: ['3.2.2'],
          help: 'Forms should have an explicit submit button'
        });
      }
      
      // Check for accessible name on form
      const hasAriaLabel = form.hasAttribute('aria-label');
      const hasAriaLabelledby = form.hasAttribute('aria-labelledby');
      const hasTitle = form.hasAttribute('title');
      
      if (!hasAriaLabel && !hasAriaLabelledby && !hasTitle && !form.id) {
        results.warnings.push({
          rule: 'form-name',
          element: info,
          impact: 'moderate',
          description: 'Form does not have an accessible name',
          snippet: form.outerHTML.slice(0, 150) + (form.outerHTML.length > 150 ? '...' : ''),
          wcag: ['4.1.2'],
          help: 'Forms should have an accessible name via aria-label, aria-labelledby, or title'
        });
      }
    });
  }
  
  /**
   * Check form validation and error message handling
   * @param document DOM document
   * @param results Scan results
   */
  function checkFormValidation(document: Document, results: ScanResults): void {
    // Check for required inputs without aria-required
    const requiredInputs = document.querySelectorAll('input[required], textarea[required], select[required]');
    
    requiredInputs.forEach(input => {
      const info: ElementInfo = {
        tagName: input.tagName.toLowerCase(),
        type: (input as HTMLInputElement).type || null,
        id: input.id || null
      };
      
      if (!input.hasAttribute('aria-required')) {
        results.warnings.push({
          rule: 'required-aria-required',
          element: info,
          impact: 'minor',
          description: 'Required input missing aria-required="true"',
          snippet: input.outerHTML,
          help: 'Add aria-required="true" to reinforce that the field is required'
        });
      }
    });
    
    // Check inputs with pattern attribute
    const patternInputs = document.querySelectorAll('input[pattern]');
    
    patternInputs.forEach(input => {
      const info: ElementInfo = {
        tagName: 'input',
        type: input.getAttribute('type') || null,
        id: input.id || null
      };
      
      if (!input.hasAttribute('title')) {
        results.violations.push({
          rule: 'pattern-title',
          element: info,
          impact: 'serious',
          description: 'Input with pattern constraint missing title attribute',
          snippet: input.outerHTML,
          wcag: ['3.3.1', '3.3.2'],
          help: 'Add a title attribute to explain the required format'
        });
      }
    });
  }
  
  /**
   * Check if an element is hidden
   * @param element Element to check
   */
  function isElementHidden(element: Element): boolean {
    if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
      return true;
    }
    
    try {
      const style = getComputedStyle(element);
      return style.display === 'none' || style.visibility === 'hidden';
    } catch (e) {
      return false;
    }
  }