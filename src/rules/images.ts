import { ScannerOptions, ScanResults, ElementInfo, Violation, Warning, Pass } from '../types';

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

    // Check <img> elements
    checkImageElements(document, results);
    
    // Check <svg> elements
    checkSvgElements(document, results);
    
    // Check background images
    checkBackgroundImages(document, window, results);
    
    // Check image maps
    checkImageMaps(document, results);
    
    return results;
  }
};

/**
 * Check all <img> elements for accessibility issues
 */
function checkImageElements(document: Document, results: ScanResults): void {
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
        wcag: ['1.1.1'],
        help: 'Images must have alternative text',
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'
      });
    } else {
      const altText = img.getAttribute('alt') || '';
      
      if (altText === '') {
        // Empty alt is valid for decorative images
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
      } else if (hasGenericAltText(altText)) {
        // Check for generic/placeholder alt text
        results.warnings.push({
          rule: 'img-alt-generic',
          element: info,
          impact: 'moderate',
          description: 'Image may have generic/placeholder alt text',
          snippet: img.outerHTML,
          wcag: ['1.1.1'],
          help: 'Replace generic alt text with specific description'
        });
      } else if (altText.length > 125) {
        // Long alt text warning
        results.warnings.push({
          rule: 'img-alt-long',
          element: info,
          impact: 'minor',
          description: 'Alt text is unusually long (over 125 characters)',
          snippet: img.outerHTML,
          wcag: ['1.1.1'],
          help: 'Consider using a more concise alt text or using a longdesc attribute'
        });
      } else {
        results.passes.push({
          rule: 'img-alt',
          element: info,
          description: 'Image has appropriate alt text',
          snippet: img.outerHTML
        });
      }
    }
    
    // Check for responsive images
    if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
      results.warnings.push({
        rule: 'img-dimensions',
        element: info,
        impact: 'minor',
        description: 'Image is missing width and/or height attributes',
        snippet: img.outerHTML,
        help: 'Set explicit width and height to prevent layout shifts'
      });
    }
  });
}

/**
 * Check SVG elements for accessibility
 * @param document DOM document
 * @param results Scan results
 */
function checkSvgElements(document: Document, results: ScanResults): void {
  const svgs = document.querySelectorAll('svg');
  
  svgs.forEach(svg => {
    const info: ElementInfo = {
      tagName: 'svg',
      id: svg.id || null,
      className: svg.classList?.toString() || null
    };
    
    // Check for role="img"
    if (!svg.hasAttribute('role') || svg.getAttribute('role') !== 'img') {
      results.warnings.push({
        rule: 'svg-role',
        element: info,
        impact: 'moderate',
        description: 'SVG element should have role="img"',
        snippet: svg.outerHTML.slice(0, 150) + (svg.outerHTML.length > 150 ? '...' : ''),
        wcag: ['1.1.1'],
        help: 'Add role="img" to SVG elements'
      });
    }
    
    // Check for accessible name via title or aria-label
    const title = svg.querySelector('title');
    const ariaLabel = svg.getAttribute('aria-label');
    const ariaLabelledby = svg.getAttribute('aria-labelledby');
    
    if (!title && !ariaLabel && !ariaLabelledby) {
      results.violations.push({
        rule: 'svg-accessible-name',
        element: info,
        impact: 'serious',
        description: 'SVG lacks accessible name (title, aria-label, or aria-labelledby)',
        snippet: svg.outerHTML.slice(0, 150) + (svg.outerHTML.length > 150 ? '...' : ''),
        wcag: ['1.1.1'],
        help: 'Add a <title> element or aria-label attribute to SVG'
      });
    } else if (title && !title.textContent?.trim()) {
      results.violations.push({
        rule: 'svg-title-empty',
        element: info,
        impact: 'serious',
        description: 'SVG title element is empty',
        snippet: svg.outerHTML.slice(0, 150) + (svg.outerHTML.length > 150 ? '...' : ''),
        wcag: ['1.1.1'],
        help: 'Add content to the SVG title element'
      });
    } else {
      results.passes.push({
        rule: 'svg-accessible-name',
        element: info,
        description: 'SVG has an accessible name',
        snippet: svg.outerHTML.slice(0, 150) + (svg.outerHTML.length > 150 ? '...' : '')
      });
    }
  });
}

/**
 * Check background images for accessibility issues
 * @param document DOM document
 * @param window Window object
 * @param results Scan results
 */
function checkBackgroundImages(document: Document, window: Window, results: ScanResults): void {
  // Find elements with background image
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach(element => {
    const style = window.getComputedStyle(element);
    const backgroundImage = style.backgroundImage;
    
    // Skip if no background image or if it's "none"
    if (!backgroundImage || backgroundImage === 'none') {
      return;
    }
    
    // Skip if the element is hidden/decorative
    if (isElementHidden(element) || element.getAttribute('aria-hidden') === 'true') {
      return;
    }
    
    const info: ElementInfo = {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      className: element.className?.toString() || null,
      textContent: element.textContent?.substring(0, 50) || null
    };
    
    // Check if meaningful background image has text alternative
    const hasTextContent = element.textContent?.trim() !== '';
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledby = element.hasAttribute('aria-labelledby');
    const hasTitle = element.hasAttribute('title');
    
    if (!hasTextContent && !hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
      // Only warn if the background image looks like content (not decoration)
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
  });
}

/**
 * Check image maps for accessibility
 * @param document DOM document
 * @param results Scan results
 */
function checkImageMaps(document: Document, results: ScanResults): void {
  const maps = document.querySelectorAll('map');
  
  maps.forEach(map => {
    const info: ElementInfo = {
      tagName: 'map',
      id: map.id || null,
      name: map.getAttribute('name') || null
    };
    
    // Check if the map is used
    const usedByImages = document.querySelectorAll(`img[usemap="#${map.name}"]`);
    
    if (usedByImages.length === 0) {
      results.warnings.push({
        rule: 'map-unused',
        element: info,
        impact: 'minor',
        description: 'Image map appears to be unused',
        snippet: map.outerHTML,
        help: 'Remove unused image maps'
      });
      return;
    }
    
    // Check area elements
    const areas = map.querySelectorAll('area');
    
    areas.forEach(area => {
      const areaInfo: ElementInfo = {
        tagName: 'area',
        shape: area.getAttribute('shape') || null,
        coords: area.getAttribute('coords') || null,
        href: area.getAttribute('href') || null
      };
      
      // Check for alt text
      if (!area.hasAttribute('alt')) {
        results.violations.push({
          rule: 'area-alt',
          element: areaInfo,
          impact: 'critical',
          description: 'Area element in image map is missing alt text',
          snippet: area.outerHTML,
          wcag: ['1.1.1', '2.4.4'],
          help: 'Add alt text to all area elements'
        });
      } else {
        results.passes.push({
          rule: 'area-alt',
          element: areaInfo,
          description: 'Area element has alt text',
          snippet: area.outerHTML
        });
      }
    });
  });
}

/**
 * Check if an element is hidden
 * @param element Element to check
 */
function isElementHidden(element: Element): boolean {
  // This is a simplified check - a real implementation would be more comprehensive
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return true;
  }
  
  // Check computed style if available
  try {
    const style = getComputedStyle(element);
    return style.display === 'none' || style.visibility === 'hidden';
  } catch (e) {
    return false;
  }
}

/**
 * Check if a background image is likely decorative
 * @param element Element to check
 */
function isBackgroundLikelyDecorative(element: Element): boolean {
  // Common decorative pattern elements
  const decorativeElements = ['header', 'footer', 'section', 'article', 'div'];
  const tagName = element.tagName?.toLowerCase() || '';
  
  if (decorativeElements.includes(tagName)) {
    // Check for certain classes that might indicate decorative backgrounds
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

/**
 * Determine if an image is likely decorative
 * @param img Image to check
 */
function isLikelyDecorativeImage(img: HTMLImageElement): boolean {
  // Images with role="presentation" are explicitly decorative
  if (img.getAttribute('role') === 'presentation' || img.getAttribute('role') === 'none') {
    return true;
  }
  
  // Very small images are often decorative
  const width = parseInt(img.getAttribute('width') || img.width.toString());
  const height = parseInt(img.getAttribute('height') || img.height.toString());
  if ((width > 0 && width < 16) || (height > 0 && height < 16)) {
    return true;
  }
  
  // Check class names for hints
  const className = img.className || '';
  if (
    className.includes('decoration') || 
    className.includes('ornament') ||
    className.includes('icon') ||
    className.includes('separator') ||
    className.includes('bg') ||
    className.includes('background')
  ) {
    return true;
  }
  
  // Check if the image is inside a link with text
  const parentLink = img.closest('a');
  if (parentLink && parentLink.textContent?.trim() && parentLink.textContent.trim().length > 0) {
    return true;
  }
  
  return false;
}

/**
 * Check if alt text appears to be generic or placeholder text
 * 
 */
function hasGenericAltText(altText: string): boolean {
  const genericTerms = ['image', 'picture', 'photo', 'img', 'graphic', 'icon', 'logo', 'photo.jpg', 'untitled'];
  const lowerAlt = altText.toLowerCase().trim();
  
  // Check for file extensions in alt text
  if (lowerAlt.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return true;
  }
  
  // Check for generic terms used alone
  if (genericTerms.includes(lowerAlt)) {
    return true;
  }
  
  // Check for very short alt text that's not meaningful
  if (lowerAlt.length < 5 && !['ok', 'yes', 'no'].includes(lowerAlt)) {
    return true;
  }
  
  return false;
}