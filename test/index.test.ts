import fs from 'fs';
import path from 'path';
import os from 'os';
import { scanHtml, scanFile, formatReport, RULE_PRESETS, resolveRuleNames } from '../src/index';

const ACCESSIBLE_HTML = `
<!DOCTYPE html>
<html lang="en">
  <head><title>Accessible Page</title></head>
  <body>
    <a href="#main">Skip to main content</a>
    <nav aria-label="Main navigation"><a href="/">Home</a></nav>
    <main id="main">
      <h1>Welcome</h1>
      <img src="hero.jpg" alt="Hero image">
      <p>Content here.</p>
    </main>
  </body>
</html>
`;

const INACCESSIBLE_HTML = `
<!DOCTYPE html>
<html>
  <head></head>
  <body>
    <img src="photo.jpg">
    <input type="text">
    <h3>Skipped heading</h3>
  </body>
</html>
`;

describe('scanHtml', () => {
  it('should return results object with passes, violations, warnings', async () => {
    const results = await scanHtml(ACCESSIBLE_HTML);
    expect(results).toHaveProperty('violations');
    expect(results).toHaveProperty('warnings');
    expect(results).toHaveProperty('passes');
    expect(Array.isArray(results.violations)).toBe(true);
    expect(Array.isArray(results.passes)).toBe(true);
    expect(Array.isArray(results.warnings)).toBe(true);
  });

  it('should detect violations in inaccessible HTML', async () => {
    const results = await scanHtml(INACCESSIBLE_HTML);
    expect(results.violations.length).toBeGreaterThan(0);
  });

  it('should detect missing alt text via images rule', async () => {
    const results = await scanHtml(INACCESSIBLE_HTML, { rules: ['images'] });
    const altViolation = results.violations.find(v => v.rule === 'img-alt');
    expect(altViolation).toBeDefined();
  });

  it('should detect missing lang via structure rule', async () => {
    const results = await scanHtml(INACCESSIBLE_HTML, { rules: ['structure'] });
    const langViolation = results.violations.find(v => v.rule === 'html-lang');
    expect(langViolation).toBeDefined();
  });

  it('should detect multiple violations in inaccessible HTML', async () => {
    const results = await scanHtml(INACCESSIBLE_HTML);
    expect(results.violations.length).toBeGreaterThan(1);
  });

  it('should only run specified rules and ignore others', async () => {
    const results = await scanHtml(INACCESSIBLE_HTML, { rules: ['images'] });
    // structure, forms, aria, keyboard, contrast rules should not have run
    const structureViolation = results.violations.find(v => v.rule === 'html-lang' || v.rule === 'document-title');
    expect(structureViolation).toBeUndefined();
  });

  it('should handle empty HTML string', async () => {
    await expect(scanHtml('')).resolves.toBeDefined();
  });

  it('should handle malformed HTML without throwing', async () => {
    await expect(scanHtml('<not valid html>')).resolves.toBeDefined();
  });
});

describe('scanFile', () => {
  let tmpFile: string;

  beforeAll(() => {
    tmpFile = path.join(os.tmpdir(), `wcag-test-${Date.now()}.html`);
    fs.writeFileSync(tmpFile, ACCESSIBLE_HTML);
  });

  afterAll(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  it('should scan an HTML file and return results', async () => {
    const results = await scanFile(tmpFile);
    expect(results).toHaveProperty('violations');
    expect(results).toHaveProperty('passes');
  });

  it('should throw for non-existent file', async () => {
    await expect(scanFile('/no/such/file.html')).rejects.toThrow();
  });
});

describe('formatReport', () => {
  let results: Awaited<ReturnType<typeof scanHtml>>;

  beforeAll(async () => {
    results = await scanHtml(INACCESSIBLE_HTML);
  });

  it('should produce valid JSON for format=json', () => {
    const output = formatReport(results, 'json');
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('summary');
    expect(parsed).toHaveProperty('violations');
  });

  it('should produce HTML string for format=html', () => {
    const output = formatReport(results, 'html');
    expect(output).toContain('<!DOCTYPE html>');
  });

  it('should produce console string for format=console', () => {
    const output = formatReport(results, 'console');
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });

  it('should default to json when format is omitted', () => {
    const output = formatReport(results);
    expect(() => JSON.parse(output)).not.toThrow();
  });
});

describe('rule presets', () => {
  it('should expose fast and full preset helpers', () => {
    expect(RULE_PRESETS.fast).toContain('images');
    expect(RULE_PRESETS.full).toContain('backgroundImages');
  });

  it('should resolve preset rules unless explicit rules are provided', () => {
    expect(resolveRuleNames({ preset: 'full' })).toContain('backgroundImages');
    expect(resolveRuleNames({ preset: 'full', rules: ['images'] })).toEqual(['images']);
  });
});
