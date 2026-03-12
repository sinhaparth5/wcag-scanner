import { JSDOM } from 'jsdom';
import ariaRule from '../src/rules/aria';

const createDoc = (html: string) => new JSDOM(html).window.document;
const createWin = (html: string) => new JSDOM(html).window as unknown as Window;

describe('ARIA Rule', () => {
  describe('checkAriaRoles', () => {
    it('should detect invalid ARIA roles', async () => {
      const html = '<div role="not-a-role">text</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'aria-role-valid');
      expect(violation).toBeDefined();
      expect(violation?.description).toContain('not-a-role');
    });

    it('should pass for valid ARIA roles', async () => {
      const html = '<div role="button">click me</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const pass = results.passes.find(p => p.rule === 'aria-role-valid');
      expect(pass).toBeDefined();
    });

    it('should pass all standard landmark roles', async () => {
      const roles = ['navigation', 'main', 'banner', 'contentinfo', 'complementary'];
      for (const role of roles) {
        const html = `<div role="${role}">content</div>`;
        const results = await ariaRule.check(createDoc(html), createWin(html), {});
        const violation = results.violations.find(v => v.rule === 'aria-role-valid');
        expect(violation).toBeUndefined();
      }
    });

    it('should not flag role=button on div as incompatible', async () => {
      const html = '<div role="button" tabindex="0">click me</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const roleCompatViolation = results.violations.find(v => v.rule === 'aria-role-compatible');
      expect(roleCompatViolation).toBeUndefined();
    });

    it('should flag role=heading on h1 as incompatible', async () => {
      const html = '<h1 role="heading">title</h1>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'aria-role-compatible');
      expect(violation).toBeDefined();
    });

    it('should flag role=link on anchor as incompatible', async () => {
      const html = '<a href="#" role="link">link</a>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'aria-role-compatible');
      expect(violation).toBeDefined();
    });
  });

  describe('checkRequiredAriaAttributes', () => {
    it('should detect missing required attributes on slider', async () => {
      const html = '<div role="slider">slider</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violations = results.violations.filter(v => v.rule === 'aria-required-attr');
      expect(violations.some(v => v.description.includes('aria-valuemin'))).toBe(true);
      expect(violations.some(v => v.description.includes('aria-valuemax'))).toBe(true);
      expect(violations.some(v => v.description.includes('aria-valuenow'))).toBe(true);
    });

    it('should pass slider with all required attributes', async () => {
      const html = '<div role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">slider</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violations = results.violations.filter(v => v.rule === 'aria-required-attr');
      expect(violations).toHaveLength(0);
    });

    it('should detect missing required attributes on combobox', async () => {
      const html = '<div role="combobox">combo</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violations = results.violations.filter(v => v.rule === 'aria-required-attr');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should detect missing required attributes on progressbar', async () => {
      const html = '<div role="progressbar">loading</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violations = results.violations.filter(v => v.rule === 'aria-required-attr');
      expect(violations.some(v => v.description.includes('aria-valuenow'))).toBe(true);
    });

    it('should detect missing required attributes on scrollbar', async () => {
      const html = '<div role="scrollbar">scroll</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violations = results.violations.filter(v => v.rule === 'aria-required-attr');
      expect(violations.some(v => v.description.includes('aria-controls'))).toBe(true);
    });
  });

  describe('checkAriaStatesProperties', () => {
    it('should detect invalid aria-* attributes', async () => {
      const html = '<div aria-bogus="true">text</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'aria-valid-attr');
      expect(violation).toBeDefined();
      expect(violation?.description).toContain('aria-bogus');
    });

    it('should pass valid aria-label', async () => {
      const html = '<button aria-label="Close dialog">X</button>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const pass = results.passes.find(p => p.rule === 'aria-valid-attr');
      expect(pass).toBeDefined();
    });

    it('should detect boolean attribute with invalid value', async () => {
      const html = '<div aria-hidden="yes">hidden</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'aria-boolean-value');
      expect(violation).toBeDefined();
      expect(violation?.description).toContain('"yes"');
    });

    it('should pass aria-hidden="true"', async () => {
      const html = '<div aria-hidden="true">hidden</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'aria-boolean-value');
      expect(violation).toBeUndefined();
    });

    it('should pass aria-hidden="false"', async () => {
      const html = '<div aria-hidden="false">visible</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'aria-boolean-value');
      expect(violation).toBeUndefined();
    });

    it('should detect invalid value on aria-expanded', async () => {
      const html = '<div role="combobox" aria-expanded="maybe" aria-controls="list">combo</div>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'aria-boolean-value');
      expect(violation).toBeDefined();
    });
  });

  describe('checkNativeSemantics', () => {
    it('should warn about redundant role="button" on button', async () => {
      const html = '<button role="button">click</button>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'aria-redundant-role');
      expect(warning).toBeDefined();
    });

    it('should warn about redundant role="checkbox" on input[type=checkbox]', async () => {
      const html = '<input type="checkbox" role="checkbox">';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'aria-redundant-role');
      expect(warning).toBeDefined();
    });

    it('should warn about redundant role="navigation" on nav', async () => {
      const html = '<nav role="navigation"><a href="/">Home</a></nav>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'aria-redundant-role');
      expect(warning).toBeDefined();
    });

    it('should not warn when role changes semantics on nav', async () => {
      const html = '<nav role="main"><a href="/">Home</a></nav>';
      const results = await ariaRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'aria-redundant-role');
      expect(warning).toBeUndefined();
    });
  });
});
