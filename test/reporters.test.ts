import jsonReporter from '../src/reporters/json';
import htmlReporter from '../src/reporters/html';
import consoleReporter from '../src/reporters/console';
import { ScanResults } from '../src/types';

const mockResults: ScanResults = {
  violations: [
    {
      rule: 'img-alt',
      impact: 'critical',
      description: 'Image is missing alt text',
      element: { tagName: 'img', id: 'hero', src: 'photo.jpg' },
      snippet: '<img id="hero" src="photo.jpg">',
      wcag: ['1.1.1'],
      help: 'Add an alt attribute to the image',
    },
  ],
  warnings: [
    {
      rule: 'tabindex-positive',
      impact: 'moderate',
      description: 'Element has a positive tabindex',
      element: { tagName: 'div', id: 'nav' },
      snippet: '<div id="nav" tabindex="1">',
      wcag: ['2.4.3'],
      help: 'Avoid positive tabindex values',
    },
  ],
  passes: [
    {
      rule: 'html-lang',
      description: 'Document language is specified: en',
    },
  ],
};

const emptyResults: ScanResults = { violations: [], warnings: [], passes: [] };

describe('JSON Reporter', () => {
  it('should return valid JSON', () => {
    const output = jsonReporter.format(mockResults, {});
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('should include correct summary counts', () => {
    const report = JSON.parse(jsonReporter.format(mockResults, {}));
    expect(report.summary.violations).toBe(1);
    expect(report.summary.warnings).toBe(1);
    expect(report.summary.passes).toBe(1);
  });

  it('should include violations array', () => {
    const report = JSON.parse(jsonReporter.format(mockResults, {}));
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].rule).toBe('img-alt');
    expect(report.violations[0].impact).toBe('critical');
  });

  it('should include timestamp in summary', () => {
    const report = JSON.parse(jsonReporter.format(mockResults, {}));
    expect(report.summary.timestamp).toBeDefined();
    expect(new Date(report.summary.timestamp).getTime()).not.toBeNaN();
  });

  it('should reflect scanner options in summary', () => {
    const report = JSON.parse(jsonReporter.format(mockResults, { level: 'AAA', rules: ['images'] }));
    expect(report.summary.options.level).toBe('AAA');
    expect(report.summary.options.rules).toContain('images');
  });

  it('should handle empty results', () => {
    const report = JSON.parse(jsonReporter.format(emptyResults, {}));
    expect(report.summary.violations).toBe(0);
    expect(report.violations).toHaveLength(0);
  });

  it('should truncate long snippets', () => {
    const longSnippet = '<div>' + 'x'.repeat(400) + '</div>';
    const results: ScanResults = {
      violations: [{
        rule: 'test',
        impact: 'minor',
        description: 'test',
        snippet: longSnippet,
      }],
      warnings: [],
      passes: [],
    };
    const report = JSON.parse(jsonReporter.format(results, {}));
    expect(report.violations[0].snippet.length).toBeLessThanOrEqual(303); // 300 + '...'
  });
});

describe('HTML Reporter', () => {
  it('should return a string containing HTML', () => {
    const output = htmlReporter.format(mockResults, {});
    expect(typeof output).toBe('string');
    expect(output).toContain('<!DOCTYPE html>');
    expect(output).toContain('<html');
  });

  it('should include violation count in output', () => {
    const output = htmlReporter.format(mockResults, {});
    expect(output).toContain('1');
  });

  it('should include violation description', () => {
    const output = htmlReporter.format(mockResults, {});
    expect(output).toContain('Image is missing alt text');
  });

  it('should include WCAG criteria', () => {
    const output = htmlReporter.format(mockResults, {});
    expect(output).toContain('1.1.1');
  });

  it('should handle empty results without error', () => {
    expect(() => htmlReporter.format(emptyResults, {})).not.toThrow();
  });
});

describe('Console Reporter', () => {
  it('should return a non-empty string', () => {
    const output = consoleReporter.format(mockResults, {});
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });

  it('should mention violation description', () => {
    const output = consoleReporter.format(mockResults, {});
    expect(output).toContain('Image is missing alt text');
  });

  it('should handle empty results without error', () => {
    expect(() => consoleReporter.format(emptyResults, {})).not.toThrow();
  });

  it('should only include the passes section in verbose mode', () => {
    const terseOutput = consoleReporter.format(mockResults, {});
    const verboseOutput = consoleReporter.format(mockResults, { verbose: true });

    expect(terseOutput).not.toContain('PASSES');
    expect(verboseOutput).toContain('PASSES');
    expect(verboseOutput).toContain('Document language is specified: en');
  });

  it('should include verbose snippets, fix text, and grouped impacts', () => {
    const longSnippet = '<button>\n\t' + 'x'.repeat(120) + '</button>';
    const results: ScanResults = {
      violations: [
        {
          rule: 'critical-issue',
          impact: 'critical',
          description: 'Critical issue',
          element: { tagName: 'button', id: 'submit', className: 'primary' },
          snippet: longSnippet,
          wcag: ['1.1.1'],
          help: 'Critical help',
          fix: { description: 'Critical fix', code: 'button.alt = "Submit";' }
        },
        {
          rule: 'fallback-impact',
          description: 'Fallback impact issue',
          element: { tagName: 'section' }
        } as any
      ] as any,
      warnings: [
        {
          rule: 'warning-issue',
          impact: 'moderate',
          description: 'Warning issue',
          element: { tagName: 'div', className: 'banner' },
          snippet: '<div class="banner">\n\twarning\n</div>',
          wcag: ['2.4.3'],
          help: 'Warning help'
        }
      ],
      passes: []
    };

    const output = consoleReporter.format(results, { verbose: true });

    expect(output).toContain('CRITICAL (1)');
    expect(output).toContain('MINOR (1)');
    expect(output).toContain('Critical issue');
    expect(output).toContain('Element: button #submit .primary');
    expect(output).toContain('WCAG: 1.1.1');
    expect(output).toMatch(/Code: <button> x{20,}\.\.\./);
    expect(output).toContain('Help: Critical help');
    expect(output).toContain('Fix: Critical fix');
    expect(output).toContain('WARNINGS');
    expect(output).toContain('Warning help');
    expect(output).toContain('Element: div .banner');
    expect(output).toContain('Code: <div class="banner"> warning </div>');
  });
});
