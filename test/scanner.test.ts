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
    const rulesDir = path.join(__dirname, '..', 'src', 'rules');
    const tempRuleFiles: string[] = [];

    afterEach(() => {
      tempRuleFiles.forEach((filePath) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        try {
          delete require.cache[require.resolve(filePath)];
        } catch {
          // Ignore cache misses for files that failed to load.
        }
      });

      tempRuleFiles.length = 0;
      jest.restoreAllMocks();
    });

    it('should include optional rules when preset is full', async () => {
      const scanner = new WCAGScanner({ preset: 'full' });
      await scanner.loadHTML('<html><body><div style="background-image:url(hero.jpg)"></div></body></html>');

      scanner.registerRule('backgroundImages', {
        check: async () => {
          return {
            passes: [],
            violations: [],
            warnings: [{
              rule: 'background-image',
              impact: 'moderate',
              description: 'Background image rule ran',
              element: { tagName: 'div' }
            }]
          };
        }
      });

      const results = await scanner.scan();
      expect(results.warnings.some(result => result.rule === 'background-image')).toBe(true);
    });

    it('should run the built-in default structure rule name', async () => {
      const scanner = new WCAGScanner();
      await scanner.loadHTML('<html><body><h1>Test</h1></body></html>');

      scanner.registerRule('structure', {
        check: async () => {
          return {
            passes: [{
              rule: 'structure',
              description: 'Structure rule ran',
              element: { tagName: 'h1' }
            }],
            violations: [],
            warnings: []
          };
        }
      });

      const results = await scanner.scan();

      expect(results.passes.some(result => result.rule === 'structure')).toBe(true);
    });

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

    it('should return early when the rules directory is missing', async () => {
      const scanner = new WCAGScanner();
      const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const readdirSpy = jest.spyOn(fs, 'readdirSync');

      await expect(scanner.loadRules()).resolves.toBeUndefined();

      expect(existsSpy).toHaveBeenCalled();
      expect(readdirSpy).not.toHaveBeenCalled();
      expect((scanner as any).rules.size).toBe(0);
    });

    it('should load valid rules and continue past invalid rule modules', async () => {
      const validRulePath = path.join(rulesDir, '__tempValidRule.js');
      const invalidRulePath = path.join(rulesDir, '__tempInvalidRule.js');
      const brokenRulePath = path.join(rulesDir, '__tempBrokenRule.js');

      fs.writeFileSync(validRulePath, 'module.exports = { check: async () => ({ passes: [], violations: [], warnings: [] }) };');
      fs.writeFileSync(invalidRulePath, 'module.exports = { nope: true };');
      fs.writeFileSync(brokenRulePath, 'throw new Error("broken temp rule");');
      tempRuleFiles.push(validRulePath, invalidRulePath, brokenRulePath);

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const scanner = new WCAGScanner();

      await scanner.loadRules();

      expect((scanner as any).rules.has('__tempValidRule')).toBe(true);
      expect((scanner as any).rules.has('__tempInvalidRule')).toBe(false);
      expect((scanner as any).rules.has('__tempBrokenRule')).toBe(false);
      expect(logSpy).toHaveBeenCalledWith('Skipping rule __tempInvalidRule: Invalid format');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error loading rule from __tempBrokenRule.js:'), expect.any(Error));
    });

    it('should continue scanning when one rule throws', async () => {
      const scanner = new WCAGScanner({ rules: ['ok-rule', 'bad-rule'] });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      await scanner.loadHTML('<html><body><h1>Test</h1></body></html>');

      scanner.registerRule('ok-rule', {
        check: async () => ({
          passes: [{ rule: 'ok-rule', description: 'ok' }],
          violations: [],
          warnings: []
        })
      });

      scanner.registerRule('bad-rule', {
        check: async () => {
          throw new Error('rule failed');
        }
      });

      const results = await scanner.scan();

      expect(results.passes).toHaveLength(1);
      expect(results.passes[0].rule).toBe('ok-rule');
      expect(errorSpy).toHaveBeenCalledWith('Error running rule bad-rule:', expect.any(Error));
    });
  });
});
