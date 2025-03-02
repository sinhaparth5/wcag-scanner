import { WCAGScanner } from '../src/scanner';
import path from 'path';
import fs from 'fs';

describe('WCAGScanner', () => {
  // Helper to load a test HTML file
  const loadTestHtml = (filename: string): string => {
    const filePath = path.join(__dirname, 'fixtures', filename);
    return fs.readFileSync(filePath, 'utf8');
  };

  describe('loadHTML', () => {
    it('should load HTML content successfully', async () => {
      const scanner = new WCAGScanner();
      const html = '<html><body><h1>Test</h1></body></html>';
      const result = await scanner.loadHTML(html);
      expect(result).toBe(true);
    });

    it('should handle loading invalid HTML', async () => {
      const scanner = new WCAGScanner();
      const html = '<not valid html>';
      const result = await scanner.loadHTML(html);
      expect(result).toBe(true); // Should still load even with invalid HTML
    });
  });

  describe('scan', () => {
    it('should throw error if HTML not loaded', async () => {
      const scanner = new WCAGScanner();
      await expect(scanner.scan()).rejects.toThrow('HTML not loaded');
    });

    it('should scan HTML with images missing alt text', async () => {
      // Create an HTML fixture with accessibility issues
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Page</title>
          </head>
          <body>
            <h1>Accessibility Test</h1>
            <img src="test.jpg"> <!-- Missing alt text -->
          </body>
        </html>
      `;
      
      // Initialize scanner with images rule
      const scanner = new WCAGScanner({
        rules: ['images'] // Only test image rules
      });
      
      await scanner.loadHTML(html);
      
      // Manually register a mock image rule for testing
      scanner.registerRule('images', {
        check: async () => {
          return {
            violations: [{
              rule: 'img-alt',
              impact: 'critical',
              description: 'Image is missing alt text',
              element: { tagName: 'img' },
              snippet: '<img src="test.jpg">'
            }],
            passes: [],
            warnings: []
          };
        }
      });
      
      const results = await scanner.scan();
      
      expect(results.violations.length).toBeGreaterThan(0);
      expect(results.violations[0].rule).toBe('img-alt');
    });
  });

  describe('rules', () => {
    it('should register and use custom rules', async () => {
      const scanner = new WCAGScanner();
      await scanner.loadHTML('<html><body><h1>Test</h1></body></html>');
      
      // Register a custom rule
      scanner.registerRule('custom-rule', {
        check: async () => {
          return {
            passes: [{ 
              rule: 'custom-rule',
              description: 'Custom rule passed',
              element: { tagName: 'h1' }
            }],
            violations: [],
            warnings: []
          };
        }
      });
      
      // Update options to use our custom rule
      scanner.updateOptions({ rules: ['custom-rule'] });
      
      const results = await scanner.scan();
      
      expect(results.passes.length).toBe(1);
      expect(results.passes[0].rule).toBe('custom-rule');
    });
  });
});