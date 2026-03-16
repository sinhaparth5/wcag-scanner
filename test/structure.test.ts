import { JSDOM } from 'jsdom';
import structureRule from '../src/rules/structure';

const createDoc = (html: string) => new JSDOM(html).window.document;
const createWin = (html: string) => new JSDOM(html).window as unknown as Window;

describe('Structure Rule', () => {
  describe('Headings', () => {
    it('should detect missing h1', async () => {
      const html = '<html lang="en"><head><title>Test</title></head><body><main><h2>Section</h2></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'heading-h1');
      expect(violation).toBeDefined();
      expect(violation?.impact).toBe('serious');
    });

    it('should pass when h1 is present', async () => {
      const html = '<html lang="en"><head><title>Test</title></head><body><main><h1>Main Title</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'heading-h1');
      expect(violation).toBeUndefined();
    });

    it('should warn about multiple h1 elements', async () => {
      const html = '<html lang="en"><head><title>Test</title></head><body><main><h1>First</h1><h1>Second</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'heading-h1-multiple');
      expect(warning).toBeDefined();
    });

    it('should detect empty heading', async () => {
      const html = '<html lang="en"><head><title>Test</title></head><body><main><h1></h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'heading-empty');
      expect(violation).toBeDefined();
    });

    it('should detect skipped heading levels', async () => {
      const html = '<html lang="en"><head><title>Test</title></head><body><main><h1>Title</h1><h3>Sub</h3></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'heading-skip');
      expect(violation).toBeDefined();
      expect(violation?.description).toContain('h1');
      expect(violation?.description).toContain('h3');
    });

    it('should pass sequential heading levels', async () => {
      const html = '<html lang="en"><head><title>Test</title></head><body><main><h1>Title</h1><h2>Sub</h2><h3>SubSub</h3></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'heading-skip');
      expect(violation).toBeUndefined();
    });
  });

  describe('Landmarks', () => {
    it('should detect missing main landmark', async () => {
      const html = '<html lang="en"><head><title>Test</title></head><body><h1>Title</h1></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'landmark-main');
      expect(violation).toBeDefined();
    });

    it('should detect multiple main landmarks', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>A</h1></main><main><h1>B</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'landmark-main-multiple');
      expect(violation).toBeDefined();
    });

    it('should pass when main landmark is present', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>Title</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'landmark-main');
      expect(violation).toBeUndefined();
      const pass = results.passes.find(p => p.rule === 'landmark-main');
      expect(pass).toBeDefined();
    });

    it('should accept role="main" as main landmark', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><div role="main"><h1>Title</h1></div></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'landmark-main');
      expect(violation).toBeUndefined();
    });

    it('should warn about missing navigation landmark', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>Title</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'landmark-navigation');
      expect(warning).toBeDefined();
    });

    it('should pass when nav is present', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><nav><a href="/">Home</a></nav><main><h1>T</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'landmark-navigation');
      expect(warning).toBeUndefined();
    });

    it('should warn when multiple complementary landmarks lack accessible names', async () => {
      const html = `
        <html lang="en">
          <head><title>T</title></head>
          <body>
            <main><h1>T</h1></main>
            <aside></aside>
            <aside></aside>
          </body>
        </html>
      `;
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      expect(results.warnings.some(w => w.rule === 'landmark-complementary-name')).toBe(true);
    });
  });

  describe('Document structure', () => {
    it('should detect missing lang attribute', async () => {
      const html = '<html><head><title>Test</title></head><body><main><h1>T</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'html-lang');
      expect(violation).toBeDefined();
      expect(violation?.wcag).toContain('3.1.1');
    });

    it('should pass when lang is set', async () => {
      const html = '<html lang="en"><head><title>Test</title></head><body><main><h1>T</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'html-lang');
      expect(violation).toBeUndefined();
      const pass = results.passes.find(p => p.rule === 'html-lang');
      expect(pass?.description).toContain('en');
    });

    it('should detect missing title', async () => {
      const html = '<html lang="en"><head></head><body><main><h1>T</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'document-title');
      expect(violation).toBeDefined();
    });

    it('should detect empty title', async () => {
      const html = '<html lang="en"><head><title>  </title></head><body><main><h1>T</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'document-title-empty');
      expect(violation).toBeDefined();
    });

    it('should pass when title is present', async () => {
      const html = '<html lang="en"><head><title>My Page</title></head><body><main><h1>T</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'document-title' || v.rule === 'document-title-empty');
      expect(violation).toBeUndefined();
      const pass = results.passes.find(p => p.rule === 'document-title');
      expect(pass?.description).toContain('My Page');
    });

    it('should warn about missing skip link', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>T</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'skip-link');
      expect(warning).toBeDefined();
    });

    it('should pass when skip link is present', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><a href="#main">Skip to main content</a><main id="main"><h1>T</h1></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'skip-link');
      expect(warning).toBeUndefined();
    });
  });

  describe('Lists', () => {
    it('should detect ul with no li elements', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>T</h1><ul></ul></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'list-structure');
      expect(violation).toBeDefined();
    });

    it('should detect ul with non-li direct children', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>T</h1><ul><div>item</div></ul></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'list-structure-child');
      expect(violation).toBeDefined();
    });

    it('should detect definition list with no dt', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>T</h1><dl><dd>desc</dd></dl></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'dl-dt');
      expect(violation).toBeDefined();
    });

    it('should detect definition list with no dd', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>T</h1><dl><dt>term</dt></dl></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'dl-dd');
      expect(violation).toBeDefined();
    });

    it('should detect invalid direct children inside definition lists', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>T</h1><dl><span>oops</span><dt>term</dt><dd>desc</dd></dl></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      expect(results.violations.some(v => v.rule === 'dl-structure')).toBe(true);
    });
  });

  describe('Tables', () => {
    it('should detect data table missing th headers', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>T</h1><table><tr><td>A</td><td>B</td></tr><tr><td>1</td><td>2</td></tr></table></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'table-headers');
      expect(violation).toBeDefined();
    });

    it('should warn about table missing caption', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>T</h1><table><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td>Alice</td></tr></tbody></table></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'table-caption');
      expect(warning).toBeDefined();
    });

    it('should pass table with th and caption', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>T</h1><table><caption>Users</caption><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td>Alice</td></tr></tbody></table></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const headerViolation = results.violations.find(v => v.rule === 'table-headers');
      expect(headerViolation).toBeUndefined();
      const captionPass = results.passes.find(p => p.rule === 'table-caption');
      expect(captionPass).toBeDefined();
    });

    it('should warn about layout table', async () => {
      const html = '<html lang="en"><head><title>T</title></head><body><main><h1>T</h1><table role="presentation"><tr><td>nav</td><td>content</td></tr></table></main></body></html>';
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'table-layout');
      expect(warning).toBeDefined();
    });

    it('should detect empty headers and empty captions', async () => {
      const html = `
        <html lang="en">
          <head><title>T</title></head>
          <body>
            <main>
              <h1>T</h1>
              <table>
                <caption> </caption>
                <thead><tr><th></th></tr></thead>
                <tbody><tr><td>A</td></tr></tbody>
              </table>
            </main>
          </body>
        </html>
      `;
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      expect(results.violations.some(v => v.rule === 'table-header-empty')).toBe(true);
      expect(results.violations.some(v => v.rule === 'table-caption-empty')).toBe(true);
    });

    it('should warn when table headers are missing scope attributes', async () => {
      const html = `
        <html lang="en">
          <head><title>T</title></head>
          <body>
            <main>
              <h1>T</h1>
              <table>
                <caption>Users</caption>
                <thead><tr><th>Name</th></tr></thead>
                <tbody><tr><td>Alice</td></tr></tbody>
              </table>
            </main>
          </body>
        </html>
      `;
      const results = await structureRule.check(createDoc(html), createWin(html), {});
      expect(results.warnings.some(w => w.rule === 'table-header-scope')).toBe(true);
    });
  });
});
