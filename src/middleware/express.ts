import { Request, Response, NextFunction } from 'express';
import { WCAGScanner, ScannerOptions, ScanResults } from '../index';

/**
 * Options for the Express middleware
 */
export interface ExpressMiddlewareOptions extends ScannerOptions {
  /** Enable/disable the middleware */
  enabled?: boolean;
  /** Custom header name for violation count */
  headerName?: string;
  /** Add inline report to HTML responses */
  inlineReport?: boolean;
  /** Callback function to handle violations */
  onViolation?: (results: ScanResults, req: Request, res: Response) => void;
}

/**
 * Create Express middleware for scanning HTML responses for accessibility issues
 * @param options Middleware options
 * @returns Express middleware function
 */
export function createMiddleware(options: ExpressMiddlewareOptions = {}) {
  const defaultOptions: ExpressMiddlewareOptions = {
    enabled: process.env.NODE_ENV !== 'production', // Disable in production by default
    level: 'AA',
    headerName: 'X-WCAG-Violations',
    inlineReport: false,
    ...options
  };
  
  return async function wcagScannerMiddleware(req: Request, res: Response, next: NextFunction) {
    // Skip if disabled or non-HTML request
    if (!defaultOptions.enabled || !shouldProcessRequest(req)) {
      return next();
    }
    
    // Store original send method
    const originalSend = res.send;
    
    // Override send method to intercept HTML responses
    res.send = function(body: any): Response {
      // Only process HTML responses
      if (typeof body === 'string' && isHtmlResponse(res)) {
        try {
          // Create scanner
          const scanner = new WCAGScanner(defaultOptions);
          
          // Run scan asynchronously (we can't make res.send async)
          scanner.loadHTML(body).then(() => {
            return scanner.scan();
          }).then((results) => {
            // Add violation count header
            res.setHeader(defaultOptions.headerName || 'X-WCAG-Violations', results.violations.length.toString());
            
            // Call violation handler if provided
            if (defaultOptions.onViolation && results.violations.length > 0) {
              defaultOptions.onViolation(results, req, res);
            }
            
            // Add inline report if enabled
            if (defaultOptions.inlineReport && results.violations.length > 0) {
              body = insertInlineReport(body, results);
            }
            
            // Send modified response
            originalSend.call(res, body);
          }).catch((error) => {
            console.error('Error in WCAG scanner middleware:', error);
            // Send original response if there's an error
            originalSend.call(res, body);
          });
          
          // Return a dummy response to prevent Express from sending twice
          return res;
        } catch (error) {
          console.error('Error in WCAG scanner middleware:', error);
        }
      }
      
      // Call original send for non-HTML responses
      return originalSend.call(this, body);
    };
    
    next();
  };
}

/**
 * Determine if the request should be processed
 * @param req Express request object
 * @returns True if request should be processed
 */
function shouldProcessRequest(req: Request): boolean {
  // Skip non-GET requests
  if (req.method !== 'GET') {
    return false;
  }
  
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return false;
  }
  
  // Skip if client doesn't want HTML
  const accept = req.headers.accept || '';
  if (!accept.includes('html') && !accept.includes('*/*')) {
    return false;
  }
  
  return true;
}

/**
 * Check if response is HTML
 * @param res Express response object
 * @returns True if response is HTML
 */
function isHtmlResponse(res: Response): boolean {
  const contentType = res.get('Content-Type') || '';
  return contentType.includes('html');
}

/**
 * Insert inline accessibility report into HTML
 * @param html Original HTML
 * @param results Scan results
 * @returns HTML with inline report
 */
function insertInlineReport(html: string, results: ScanResults): string {
  // Skip if no violations
  if (results.violations.length === 0) {
    return html;
  }
  
  // Create simple inline report
  const report = `
    <div id="wcag-scanner-report" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      background: white;
      border: 2px solid #e53935;
      border-radius: 8px;
      padding: 20px;
      max-width: 400px;
      max-height: 80vh;
      overflow: auto;
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
      font-family: sans-serif;
      color: #333;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
      ">
        <h3 style="margin: 0; color: #e53935;">
          ${results.violations.length} Accessibility Issues Found
        </h3>
        <button onclick="document.getElementById('wcag-scanner-report').style.display='none'" style="
          background: #f5f5f5;
          border: none;
          border-radius: 4px;
          padding: 5px 10px;
          cursor: pointer;
        ">
          Close
        </button>
      </div>
      
      <ul style="
        list-style-type: none;
        padding: 0;
        margin: 0;
      ">
        ${results.violations.slice(0, 5).map(violation => `
          <li style="
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
          ">
            <div style="
              font-weight: bold;
              margin-bottom: 5px;
            ">
              ${violation.description}
            </div>
            ${violation.help ? `
              <div style="
                font-size: 14px;
                margin-bottom: 8px;
              ">
                ${violation.help}
              </div>
            ` : ''}
            ${violation.element ? `
              <div style="
                font-size: 13px;
                color: #666;
              ">
                ${violation.element.tagName}
                ${violation.element.id ? `#${violation.element.id}` : ''}
              </div>
            ` : ''}
          </li>
        `).join('')}
        ${results.violations.length > 5 ? `
          <li style="text-align: center; font-size: 14px; color: #666;">
            +${results.violations.length - 5} more issues
          </li>
        ` : ''}
      </ul>
      <div style="
        margin-top: 15px;
        font-size: 12px;
        text-align: right;
        color: #666;
      ">
        Generated by WCAG Scanner
      </div>
    </div>
  `;
  
  // Insert before </body> if it exists, otherwise append to the end
  if (html.includes('</body>')) {
    return html.replace('</body>', `${report}</body>`);
  } else {
    return html + report;
  }
}

export default {
  createMiddleware
};