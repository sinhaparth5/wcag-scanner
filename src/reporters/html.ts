import { ScanResults, ScannerOptions, Violation, Warning, Pass } from '../types';

/**
 * Format scan results as HTML
 * @param results Scanner results object
 * @param options Scanner options used for the scan
 * @returns HTML report as a string
 */
export function format(results: ScanResults, options: ScannerOptions = {}): string {
  const { violations, warnings, passes } = results;

  // Generate HTML
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WCAG Accessibility Report</title>
      <style>
        :root {
          --color-critical: #e53935;
          --color-serious: #f57c00;
          --color-moderate: #fbc02d;
          --color-minor: #039be5;
          --color-pass: #43a047;
          --color-text: #333;
          --color-background: #fff;
          --color-card: #f5f5f5;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: var(--color-text);
          background-color: var(--color-background);
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        header {
          margin-bottom: 2rem;
        }
        
        h1, h2, h3, h4, h5, h6 {
          margin-top: 0;
        }
        
        .summary {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .summary-card {
          flex: 1;
          min-width: 200px;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .summary-card.violations {
          background-color: rgba(229, 57, 53, 0.1);
          border-left: 4px solid var(--color-critical);
        }
        
        .summary-card.warnings {
          background-color: rgba(251, 192, 45, 0.1);
          border-left: 4px solid var(--color-moderate);
        }
        
        .summary-card.passes {
          background-color: rgba(67, 160, 71, 0.1);
          border-left: 4px solid var(--color-pass);
        }
        
        .summary-number {
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        
        .summary-card.violations .summary-number {
          color: var(--color-critical);
        }
        
        .summary-card.warnings .summary-number {
          color: var(--color-moderate);
        }
        
        .summary-card.passes .summary-number {
          color: var(--color-pass);
        }
        
        .summary-label {
          font-size: 1.1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .result-card {
          background-color: var(--color-card);
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .result-card h3 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
        }
        
        .impact-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
          text-transform: uppercase;
          margin-right: 0.5rem;
        }
        
        .impact-badge.critical {
          background-color: var(--color-critical);
          color: white;
        }
        
        .impact-badge.serious {
          background-color: var(--color-serious);
          color: white;
        }
        
        .impact-badge.moderate {
          background-color: var(--color-moderate);
          color: black;
        }
        
        .impact-badge.minor {
          background-color: var(--color-minor);
          color: white;
        }
        
        .code-block {
          background-color: #f8f8f8;
          border: 1px solid #ddd;
          border-left: 3px solid #ccc;
          border-radius: 4px;
          padding: 1rem;
          overflow-x: auto;
          font-family: monospace;
          font-size: 0.9rem;
          margin: 1rem 0;
        }
        
        .code-block.violation {
          border-left-color: var(--color-critical);
        }
        
        .code-block.warning {
          border-left-color: var(--color-moderate);
        }
        
        .code-block.pass {
          border-left-color: var(--color-pass);
        }
        
        .code-block.fix {
          border-left-color: var(--color-pass);
          background-color: rgba(67, 160, 71, 0.05);
        }
        
        .result-meta {
          margin-top: 1rem;
          font-size: 0.9rem;
          color: #666;
        }
        
        .result-meta-item {
          margin-bottom: 0.5rem;
        }
        
        .result-meta-label {
          font-weight: bold;
          display: inline-block;
          min-width: 100px;
        }
        
        .tabs {
          display: flex;
          border-bottom: 1px solid #ddd;
          margin-bottom: 2rem;
        }
        
        .tab {
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          font-weight: bold;
        }
        
        .tab.active {
          border-bottom-color: #333;
        }
        
        .tab-content {
          display: none;
        }
        
        .tab-content.active {
          display: block;
        }
        
        .collapse-toggle {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          margin-left: auto;
          color: #666;
        }
        
        .result-details {
          margin-top: 1rem;
        }
        
        .filter-bar {
          display: flex;
          margin-bottom: 1rem;
          align-items: center;
        }
        
        .search-box {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-right: 1rem;
          width: 250px;
        }
        
        .filter-label {
          margin-right: 0.5rem;
        }
        
        .filter-select {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: white;
        }
        
        @media (prefers-color-scheme: dark) {
          :root {
            --color-text: #eee;
            --color-background: #121212;
            --color-card: #1e1e1e;
          }
          
          .code-block {
            background-color: #2a2a2a;
            border-color: #444;
          }
          
          .search-box, .filter-select {
            background-color: #2a2a2a;
            border-color: #444;
            color: var(--color-text);
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>WCAG Accessibility Report</h1>
          <p>Level: ${options.level || 'AA'} | Date: ${new Date().toLocaleString()}</p>
        </header>
        
        <div class="summary">
          <div class="summary-card violations">
            <div class="summary-number">${violations.length}</div>
            <div class="summary-label">Violations</div>
          </div>
          <div class="summary-card warnings">
            <div class="summary-number">${warnings.length}</div>
            <div class="summary-label">Warnings</div>
          </div>
          <div class="summary-card passes">
            <div class="summary-number">${passes.length}</div>
            <div class="summary-label">Passes</div>
          </div>
        </div>
        
        <div class="tabs">
          <div class="tab active" data-tab="violations">Violations</div>
          <div class="tab" data-tab="warnings">Warnings</div>
          <div class="tab" data-tab="passes">Passes</div>
        </div>
        
        <div class="tab-content active" id="violations-content">
          <div class="filter-bar">
            <input type="text" class="search-box" placeholder="Search violations..." id="violations-search">
            <span class="filter-label">Impact:</span>
            <select class="filter-select" id="violations-filter">
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="serious">Serious</option>
              <option value="moderate">Moderate</option>
              <option value="minor">Minor</option>
            </select>
          </div>
          
          ${formatViolationsList(violations)}
        </div>
        
        <div class="tab-content" id="warnings-content">
          <div class="filter-bar">
            <input type="text" class="search-box" placeholder="Search warnings..." id="warnings-search">
          </div>
          
          ${formatWarningsList(warnings)}
        </div>
        
        <div class="tab-content" id="passes-content">
          ${formatPassesList(passes)}
        </div>
      </div>
      
      <script>
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
          tab.addEventListener('click', () => {
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab + '-content').classList.add('active');
          });
        });
        
        // Toggle result details
        document.querySelectorAll('.collapse-toggle').forEach(toggle => {
          toggle.addEventListener('click', () => {
            const details = toggle.closest('.result-card').querySelector('.result-details');
            const isVisible = details.style.display !== 'none';
            
            details.style.display = isVisible ? 'none' : 'block';
            toggle.textContent = isVisible ? '▼' : '▲';
          });
        });
        
        // Filter violations by impact
        document.getElementById('violations-filter').addEventListener('change', (e) => {
          const value = e.target.value;
          document.querySelectorAll('#violations-content .result-card').forEach(card => {
            if (value === 'all' || card.dataset.impact === value) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          });
        });
        
        // Search functionality
        function setupSearch(searchId, contentId) {
          document.getElementById(searchId).addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            document.querySelectorAll('#' + contentId + ' .result-card').forEach(card => {
              const text = card.textContent.toLowerCase();
              if (text.includes(value)) {
                card.style.display = 'block';
              } else {
                card.style.display = 'none';
              }
            });
          });
        }
        
        setupSearch('violations-search', 'violations-content');
        setupSearch('warnings-search', 'warnings-content');
      </script>
    </body>
    </html>
  `;

  return html;
}

/**
 * Format violations as HTML
 * @param violations Array of violations
 * @returns HTML string
 */
function formatViolationsList(violations: Violation[]): string {
  if (violations.length === 0) {
    return '<p>No violations found. Great job!</p>';
  }

  // Group violations by impact
  const byImpact: Record<string, Violation[]> = {};
  violations.forEach(violation => {
    const impact = violation.impact || 'minor';
    if (!byImpact[impact]) {
      byImpact[impact] = [];
    }
    byImpact[impact].push(violation);
  });

  // Output violations by impact (most severe first)
  let html = '';
  const impactOrder = ['critical', 'serious', 'moderate', 'minor'];
  
  impactOrder.forEach(impact => {
    if (byImpact[impact] && byImpact[impact].length > 0) {
      byImpact[impact].forEach(violation => {
        html += formatViolationCard(violation, impact);
      });
    }
  });

  return html;
}

/**
 * Format a single violation as an HTML card
 * @param violation Violation object
 * @param impact Impact level
 * @returns HTML string
 */
function formatViolationCard(violation: Violation, impact: string): string {
  return `
    <div class="result-card" data-impact="${impact}">
      <h3>
        <span class="impact-badge ${impact}">${impact}</span>
        ${escapeHtml(violation.description)}
        <button class="collapse-toggle">▼</button>
      </h3>
      
      <div class="result-details" style="display: none;">
        ${violation.element ? `
          <div class="result-meta">
            <div class="result-meta-item">
              <span class="result-meta-label">Element:</span>
              ${escapeHtml(formatElement(violation.element))}
            </div>
          </div>
        ` : ''}
        
        ${violation.wcag && violation.wcag.length > 0 ? `
          <div class="result-meta">
            <div class="result-meta-item">
              <span class="result-meta-label">WCAG:</span>
              ${violation.wcag.map(wcag => `<a href="https://www.w3.org/WAI/WCAG21/Understanding/${wcag.toLowerCase()}" target="_blank">${wcag}</a>`).join(', ')}
            </div>
          </div>
        ` : ''}
        
        ${violation.help ? `
          <div class="result-meta">
            <div class="result-meta-item">
              <span class="result-meta-label">Help:</span>
              ${escapeHtml(violation.help)}
            </div>
          </div>
        ` : ''}
        
        ${violation.snippet ? `
          <div class="code-block violation">
            ${escapeHtml(violation.snippet)}
          </div>
        ` : ''}
        
        ${violation.fix ? `
          <h4>Suggested Fix</h4>
          <p>${escapeHtml(violation.fix.description)}</p>
          ${violation.fix.explanation ? `<p><em>${escapeHtml(violation.fix.explanation)}</em></p>` : ''}
          ${violation.fix.code ? `
            <div class="code-block fix">
              ${escapeHtml(violation.fix.code)}
            </div>
          ` : ''}
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Format warnings as HTML
 * @param warnings Array of warnings
 * @returns HTML string
 */
function formatWarningsList(warnings: Warning[]): string {
  if (warnings.length === 0) {
    return '<p>No warnings found.</p>';
  }

  let html = '';
  warnings.forEach(warning => {
    html += `
      <div class="result-card">
        <h3>
          ${escapeHtml(warning.description)}
          <button class="collapse-toggle">▼</button>
        </h3>
        
        <div class="result-details" style="display: none;">
          ${warning.element ? `
            <div class="result-meta">
              <div class="result-meta-item">
                <span class="result-meta-label">Element:</span>
                ${escapeHtml(formatElement(warning.element))}
              </div>
            </div>
          ` : ''}
          
          ${warning.wcag && warning.wcag.length > 0 ? `
            <div class="result-meta">
              <div class="result-meta-item">
                <span class="result-meta-label">WCAG:</span>
                ${warning.wcag.map(wcag => `<a href="https://www.w3.org/WAI/WCAG21/Understanding/${wcag.toLowerCase()}" target="_blank">${wcag}</a>`).join(', ')}
              </div>
            </div>
          ` : ''}
          
          ${warning.help ? `
            <div class="result-meta">
              <div class="result-meta-item">
                <span class="result-meta-label">Help:</span>
                ${escapeHtml(warning.help)}
              </div>
            </div>
          ` : ''}
          
          ${warning.snippet ? `
            <div class="code-block warning">
              ${escapeHtml(warning.snippet)}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  return html;
}

/**
 * Format passes as HTML
 * @param passes Array of passes
 * @returns HTML string
 */
function formatPassesList(passes: Pass[]): string {
  if (passes.length === 0) {
    return '<p>No passed checks recorded.</p>';
  }

  let html = '';
  passes.forEach(pass => {
    html += `
      <div class="result-card">
        <h3>
          ${escapeHtml(pass.description)}
          <button class="collapse-toggle">▼</button>
        </h3>
        
        <div class="result-details" style="display: none;">
          ${pass.element ? `
            <div class="result-meta">
              <div class="result-meta-item">
                <span class="result-meta-label">Element:</span>
                ${escapeHtml(formatElement(pass.element))}
              </div>
            </div>
          ` : ''}
          
          ${pass.snippet ? `
            <div class="code-block pass">
              ${escapeHtml(pass.snippet)}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  return html;
}

/**
 * Format element information as a string
 * @param element Element info object
 * @returns Formatted string
 */
function formatElement(element: any): string {
  if (!element) return 'Unknown';
  
  let result = element.tagName || 'unknown';
  
  if (element.id) {
    result += ` #${element.id}`;
  }
  
  if (element.className) {
    result += ` .${element.className}`;
  }
  
  if (element.type) {
    result += ` type="${element.type}"`;
  }
  
  if (element.src) {
    result += ` src="...${element.src.substring(element.src.lastIndexOf('/') + 1)}"`;
  }
  
  return result;
}

/**
 * Escape HTML special characters
 * @param str Input string
 * @returns Escaped string
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default {
  format
};