import { ScannerOptions, ScanResults, ElementInfo } from "../types";

/**
 * Check image accessibility (alt text, etc.)
 */
export default {
    /**
     * Run image accessibility checks
     * @param document DOM document
     * @param window Browser window
     * @param options Scanner options
     * @returns Promise<ScanResults> Results from image checks
     */
    async check(document: Document, window: Window, options: ScannerOptions): Promise<ScanResults> {
        const results: ScanResults = {
            passes: [],
            violations: [],
            warnings: []
        };

        // Get all images
        const images = document.querySelectorAll('img');

        images.forEach(img => {
            const info: ElementInfo = {
                tagName: 'img',
                id: img.id || null,
                className: img.className || null,
                src: img.getAttribute('src') || null
            };

            // Check for alt attribute
            if (!img.hasAttribute('alt')) {
                results.violations.push({
                    rule: 'img-alt',
                    element: info,
                    impact: 'critical',
                    description: 'Image is missing alt text',
                    snippet: img.outerHTML,
                    wcag: ['1.1.1', '1.1.1.1'],
                    help: 'Images must have alternative text',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'
                });
            } else {
                // Alt text exits, check quality
                const altText = img.getAttribute('alt') || '';

                if (altText === '') {
                    //Empty alt is valid for decorative image, but let's add a warning
                    // if it doesn't appear to tbe decorative
                    if (!isLikelyDecorativeImage(img)) {
                        results.warnings.push({
                            rule: 'img-alt-decorative',
                            element: info,
                            impact: 'moderate',
                            description: 'Image has empty alt text but may not be decorative',
                            snippet: img.outerHTML,
                            wcag: ['1.1.1'],
                            help: 'Verify this image is decorative; if not, add descriptive alt text'
                        });
                    } else {
                        results.passes.push({
                        rule: 'img-alt-decorative',
                        element: info,
                        description: 'Decorative image has appropriate empty alt text',
                        snippet: img.outerHTML
                        });
                    }
                } else {
                    results.passes.push({
                        rule: 'img-alt',
                        element: info,
                        description: 'Image has alt text',
                        snippet: img.outerHTML
                    });
                }
            }
        });
        return results;
    }
}

/**
 * Determine if an image is likely decorative
 * @param img Image element
 * @returns boolean True if likely decorative
 */
function isLikelyDecorativeImage(img: HTMLImageElement): boolean {
    // Images with role="presentation" are explicitly decorative
    if (img.getAttribute('role') === 'presentation') {
      return true;
    }
    
    // Very small images are often decorative
    const width = parseInt(img.width.toString());
    const height = parseInt(img.height.toString());
    if ((width > 0 && width < 16) || (height > 0 && height < 16)) {
      return true;
    }
    
    // Check class names for hints
    const className = img.className || '';
    if (
      className.includes('decoration') || 
      className.includes('ornament') ||
      className.includes('icon') ||
      className.includes('separator')
    ) {
      return true;
    }
    
    return false;
  }