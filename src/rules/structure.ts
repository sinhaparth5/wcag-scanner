import { ScannerOptions, ScanResults, ElementInfo } from '../types';

/**
 * Main application functionality
 */
export default {
    /**
     * Run accessibility checks on the entire document
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

        // Check heading structure
        checkHeadings(document, results);
        
        // Check landmark regions
        checkLandmarks(document, results);
        
        // Check document structure
        checkDocumentStructure(document, results);
        
        // Check lists
        checkLists(document, results);
        
        // Check tables
        checkTables(document, results);
        
        return results;
    }
};

/**
 * Check heading structure and hierarchy
 * @param document DOM document
 * @param results Results
 */
function checkHeadings(document: Document, results: ScanResults): void {
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingLevels: { [key: string]: number } = {};
  let previousLevel = 0;
  
  // Count headings by level
  headings.forEach(heading => {
    const level = parseInt(heading.tagName.substring(1));
    headingLevels[level] = (headingLevels[level] || 0) + 1;
  });
  
  // Check if there's an h1
  if (!headingLevels[1]) {
    results.violations.push({
      rule: 'heading-h1',
      impact: 'serious',
      description: 'Document does not have an h1 heading',
      wcag: ['1.3.1', '2.4.6'],
      help: 'Pages should contain at least one h1 heading for the main content'
    });
  } else if (headingLevels[1] > 1) {
    // Multiple h1 elements - allowed in HTML5 but can be confusing
    results.warnings.push({
      rule: 'heading-h1-multiple',
      impact: 'moderate',
      description: `Document has multiple h1 headings (${headingLevels[1]})`,
      wcag: ['1.3.1', '2.4.6'],
      help: 'Consider using only one h1 heading for the main content title'
    });
  }
  
  // Check heading hierarchy
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1));
    const info: ElementInfo = {
      tagName: heading.tagName.toLowerCase(),
      id: heading.id || null,
      textContent: heading.textContent?.trim() || null
    };
    
    // Check for empty headings
    if (!heading.textContent?.trim()) {
      results.violations.push({
        rule: 'heading-empty',
        element: info,
        impact: 'serious',
        description: `Empty ${heading.tagName} element`,
        snippet: heading.outerHTML,
        wcag: ['1.3.1', '2.4.6'],
        help: 'Headings must have text content'
      });
    }
    
    // Check for skipped heading levels
    if (index > 0 && level > previousLevel && level > previousLevel + 1) {
      results.violations.push({
        rule: 'heading-skip',
        element: info,
        impact: 'moderate',
        description: `Heading level skipped from h${previousLevel} to h${level}`,
        snippet: heading.outerHTML,
        wcag: ['1.3.1'],
        help: 'Heading levels should not be skipped (e.g., h2 to h4)'
      });
    }
    
    previousLevel = level;
  });
}

/**
 * Check landmark regions
 * @param document DOM document
 * @param results Results
 */
function checkLandmarks(document: Document, results: ScanResults): void {
  // Check for main landmark
  const mainElements = document.querySelectorAll('main, [role="main"]');
  
  if (mainElements.length === 0) {
    results.violations.push({
      rule: 'landmark-main',
      impact: 'serious',
      description: 'Page does not contain a main landmark',
      wcag: ['1.3.1', '2.4.1'],
      help: 'Pages should have a main landmark to identify the main content'
    });
  } else if (mainElements.length > 1) {
    results.violations.push({
      rule: 'landmark-main-multiple',
      impact: 'moderate',
      description: `Page contains multiple main landmarks (${mainElements.length})`,
      wcag: ['1.3.1'],
      help: 'Pages should have exactly one main landmark'
    });
  } else {
    results.passes.push({
      rule: 'landmark-main',
      description: 'Page has a main landmark'
    });
  }
  
  // Check for navigation landmark
  const navElements = document.querySelectorAll('nav, [role="navigation"]');
  
  if (navElements.length === 0) {
    results.warnings.push({
      rule: 'landmark-navigation',
      impact: 'moderate',
      description: 'Page does not contain a navigation landmark',
      wcag: ['1.3.1', '2.4.1'],
      help: 'Pages should have at least one navigation landmark'
    });
  } else {
    results.passes.push({
      rule: 'landmark-navigation',
      description: `Page has ${navElements.length} navigation landmark(s)`
    });
  }
  
  // Check other landmarks
  checkLandmarkElement(document, 'header, [role="banner"]', 'banner', results);
  checkLandmarkElement(document, 'footer, [role="contentinfo"]', 'contentinfo', results);
  checkLandmarkElement(document, 'aside, [role="complementary"]', 'complementary', results);
  checkLandmarkElement(document, 'form, [role="form"]', 'form', results);
  checkLandmarkElement(document, '[role="search"]', 'search', results);
}

/**
 * Check a specific landmark type
 * @param document DOM document
 * @param selector CSS selector for the landmark
 * @param landmarkName CSS name
 * @param results Results 
 */
function checkLandmarkElement(document: Document, selector: string, landmarkName: string, results: ScanResults): void {
  const elements = document.querySelectorAll(selector);
  
  if (elements.length > 0) {
    results.passes.push({
      rule: `landmark-${landmarkName}`,
      description: `Page has ${elements.length} ${landmarkName} landmark(s)`
    });
    
    // Check if landmarks have accessible names
    elements.forEach(element => {
      const hasAccessibleName = element.hasAttribute('aria-label') || 
                               element.hasAttribute('aria-labelledby') ||
                               element.hasAttribute('title');
      
      if (!hasAccessibleName && elements.length > 1) {
        const info: ElementInfo = {
          tagName: element.tagName.toLowerCase(),
          role: element.getAttribute('role') || null,
          id: element.id || null
        };
        
        results.warnings.push({
          rule: `landmark-${landmarkName}-name`,
          element: info,
          impact: 'moderate',
          description: `${landmarkName} landmark has no accessible name`,
          snippet: element.outerHTML.slice(0, 150) + (element.outerHTML.length > 150 ? '...' : ''),
          help: `When multiple ${landmarkName} landmarks exist, they should have accessible names`
        });
      }
    });
  }
}

/**
 * Check document structure
 * @param document DOM document
 * @param results Results
 */
function checkDocumentStructure(document: Document, results: ScanResults): void {
  // Check for document language
  if (!document.documentElement.hasAttribute('lang')) {
    results.violations.push({
      rule: 'html-lang',
      impact: 'serious',
      description: 'Document language is not specified',
      snippet: document.documentElement.outerHTML.substring(0, 150) + '...',
      wcag: ['3.1.1'],
      help: 'Add a lang attribute to the html element'
    });
  } else {
    results.passes.push({
      rule: 'html-lang',
      description: `Document language is specified: ${document.documentElement.getAttribute('lang')}`
    });
  }
  
  // Check for page title
  const title = document.querySelector('title');
  
  if (!title) {
    results.violations.push({
      rule: 'document-title',
      impact: 'serious',
      description: 'Document does not have a title element',
      wcag: ['2.4.2'],
      help: 'Add a title element with descriptive text to the head'
    });
  } else if (!title.textContent?.trim()) {
    results.violations.push({
      rule: 'document-title-empty',
      impact: 'serious',
      description: 'Document title is empty',
      wcag: ['2.4.2'],
      help: 'The title element must contain text'
    });
  } else {
    results.passes.push({
      rule: 'document-title',
      description: `Document has a title: "${title.textContent?.trim()}"`
    });
  }
  
  // Check for skip link
  const skipLinks = Array.from(document.querySelectorAll('a[href^="#"]')).filter(link => {
    const text = link.textContent?.toLowerCase().trim() || '';
    return text.includes('skip') || text.includes('jump') || text.includes('main content');
  });
  
  if (skipLinks.length === 0) {
    results.warnings.push({
      rule: 'skip-link',
      impact: 'moderate',
      description: 'No skip link found',
      wcag: ['2.4.1'],
      help: 'Add a skip link at the beginning of the page'
    });
  } else {
    results.passes.push({
      rule: 'skip-link',
      description: 'Page has a skip link'
    });
  }
}

/**
 * Check list elements
 * @param document DOM document
 * @param results Results
 */
function checkLists(document: Document, results: ScanResults): void {
  // Check for proper list structure
  const lists = document.querySelectorAll('ul, ol');
  
  lists.forEach(list => {
    const info: ElementInfo = {
      tagName: list.tagName.toLowerCase(),
      id: list.id || null
    };
    
    // Ensure lists contain li elements
    const listItems = list.querySelectorAll('li');
    
    if (listItems.length === 0) {
      results.violations.push({
        rule: 'list-structure',
        element: info,
        impact: 'moderate',
        description: `${list.tagName} has no list items`,
        snippet: list.outerHTML.slice(0, 150) + (list.outerHTML.length > 150 ? '...' : ''),
        wcag: ['1.3.1'],
        help: `${list.tagName} elements must contain li elements`
      });
    }
    
    // Check for non-li direct children
    const directChildren = Array.from(list.children);
    const nonListItems = directChildren.filter(child => child.tagName.toLowerCase() !== 'li');
    
    if (nonListItems.length > 0) {
      results.violations.push({
        rule: 'list-structure-child',
        element: info,
        impact: 'moderate',
        description: `${list.tagName} contains direct children that are not li elements`,
        snippet: list.outerHTML.slice(0, 150) + (list.outerHTML.length > 150 ? '...' : ''),
        wcag: ['1.3.1'],
        help: `${list.tagName} should only have li elements as direct children`
      });
    }
  });
  
  // Check definition lists
  const dls = document.querySelectorAll('dl');
  
  dls.forEach(dl => {
    const info: ElementInfo = {
      tagName: 'dl',
      id: dl.id || null
    };
    
    // Check for dt and dd elements
    const terms = dl.querySelectorAll('dt');
    const descriptions = dl.querySelectorAll('dd');
    
    if (terms.length === 0) {
      results.violations.push({
        rule: 'dl-dt',
        element: info,
        impact: 'moderate',
        description: 'Definition list has no terms (dt elements)',
        snippet: dl.outerHTML.slice(0, 150) + (dl.outerHTML.length > 150 ? '...' : ''),
        wcag: ['1.3.1'],
        help: 'Definition lists must have at least one dt element'
      });
    }
    
    if (descriptions.length === 0) {
      results.violations.push({
        rule: 'dl-dd',
        element: info,
        impact: 'moderate',
        description: 'Definition list has no descriptions (dd elements)',
        snippet: dl.outerHTML.slice(0, 150) + (dl.outerHTML.length > 150 ? '...' : ''),
        wcag: ['1.3.1'],
        help: 'Definition lists must have at least one dd element'
      });
    }
    
    // Check for non-dt/dd direct children
    const directChildren = Array.from(dl.children);
    const invalidChildren = directChildren.filter(child => {
      const tagName = child.tagName.toLowerCase();
      return tagName !== 'dt' && tagName !== 'dd' && tagName !== 'div'; // HTML5 allows div to group dt/dd pairs
    });
    
    if (invalidChildren.length > 0) {
      results.violations.push({
        rule: 'dl-structure',
        element: info,
        impact: 'moderate',
        description: 'Definition list contains invalid direct children',
        snippet: dl.outerHTML.slice(0, 150) + (dl.outerHTML.length > 150 ? '...' : ''),
        wcag: ['1.3.1'],
        help: 'Definition lists should only contain dt, dd, and div elements'
      });
    }
  });
}

/**
 * Check table structure
 * @param document DOM document
 * @param results Results
 */
function checkTables(document: Document, results: ScanResults): void {
  const tables = document.querySelectorAll('table');
  
  tables.forEach(table => {
    const info: ElementInfo = {
      tagName: 'table',
      id: table.id || null
    };
    
    // Check if data table or layout table
    const isLayoutTable = isLikelyLayoutTable(table);
    
    if (isLayoutTable) {
      results.warnings.push({
        rule: 'table-layout',
        element: info,
        impact: 'moderate',
        description: 'Table appears to be used for layout',
        snippet: table.outerHTML.slice(0, 150) + (table.outerHTML.length > 150 ? '...' : ''),
        help: 'Use CSS for layout instead of tables'
      });
      return;
    }
    
    // Check for table headers
    const headers = table.querySelectorAll('th');
    
    if (headers.length === 0) {
      results.violations.push({
        rule: 'table-headers',
        element: info,
        impact: 'serious',
        description: 'Data table has no headers (th elements)',
        snippet: table.outerHTML.slice(0, 150) + (table.outerHTML.length > 150 ? '...' : ''),
        wcag: ['1.3.1'],
        help: 'Data tables should have headers using th elements'
      });
    } else {
      results.passes.push({
        rule: 'table-headers',
        element: info,
        description: 'Table has headers'
      });
      
      // Check headers for content
      headers.forEach(header => {
        if (!header.textContent?.trim()) {
          const headerInfo: ElementInfo = {
            tagName: 'th',
            id: header.id || null
          };
          
          results.violations.push({
            rule: 'table-header-empty',
            element: headerInfo,
            impact: 'serious',
            description: 'Table header is empty',
            snippet: header.outerHTML,
            wcag: ['1.3.1'],
            help: 'Table headers must have text content'
          });
        }
      });
    }
    
    // Check for caption
    const caption = table.querySelector('caption');
    
    if (!caption) {
      results.warnings.push({
        rule: 'table-caption',
        element: info,
        impact: 'moderate',
        description: 'Table does not have a caption',
        snippet: table.outerHTML.slice(0, 150) + (table.outerHTML.length > 150 ? '...' : ''),
        wcag: ['1.3.1'],
        help: 'Data tables should have captions to describe the table content'
      });
    } else if (!caption.textContent?.trim()) {
      results.violations.push({
        rule: 'table-caption-empty',
        element: info,
        impact: 'moderate',
        description: 'Table caption is empty',
        snippet: caption.outerHTML,
        wcag: ['1.3.1'],
        help: 'Table captions must have text content'
      });
    } else {
      results.passes.push({
        rule: 'table-caption',
        element: info,
        description: 'Table has a caption'
      });
    }
    
    // Check for scope attributes on th elements
    const rowHeaders = table.querySelectorAll('tr th');
    const colHeaders = table.querySelectorAll('thead th, tbody tr:first-child th');
    
    // If we have clear column or row headers, check for scope
    if (rowHeaders.length > 0 || colHeaders.length > 0) {
      const headersWithoutScope = Array.from(headers).filter(
        th => !th.hasAttribute('scope') && !th.hasAttribute('id')
      );
      
      if (headersWithoutScope.length > 0) {
        results.warnings.push({
          rule: 'table-header-scope',
          element: info,
          impact: 'moderate',
          description: 'Table headers do not have scope attributes',
          snippet: table.outerHTML.slice(0, 150) + (table.outerHTML.length > 150 ? '...' : ''),
          wcag: ['1.3.1'],
          help: 'Add scope="col" or scope="row" to table headers'
        });
      }
    }
  });
}

/**
 * Determine if a table is likely used for layout rather than data
 * @param table Table element
 */
function isLikelyLayoutTable(table: HTMLTableElement): boolean {
  // Tables with no th elements and only one row or column are often layout tables
  const headers = table.querySelectorAll('th');
  const rows = table.querySelectorAll('tr');
  
  if (headers.length === 0 && (rows.length === 1 || rows.length > 0 && rows[0].querySelectorAll('td').length === 1)) {
    return true;
  }
  
  // Tables with role="presentation" are explicitly layout tables
  if (table.getAttribute('role') === 'presentation' || table.getAttribute('role') === 'none') {
    return true;
  }
  
  // Check class names for hints
  const className = table.className || '';
  if (
    className.includes('layout') || 
    className.includes('grid') || 
    className.includes('container') ||
    className.includes('wrapper')
  ) {
    return true;
  }
  
  return false;
}