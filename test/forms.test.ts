import { JSDOM } from 'jsdom';
import formsRule from '../src/rules/forms';

const createDoc = (html: string) => new JSDOM(html).window.document;
const createWin = (html: string) => new JSDOM(html).window as unknown as Window;

describe('Forms Rule', () => {
  describe('Input labels', () => {
    it('should detect input without any label', async () => {
      const html = '<form><input type="text"></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'form-label');
      expect(violation).toBeDefined();
      expect(violation?.impact).toBe('critical');
    });

    it('should pass input with explicit label via for/id', async () => {
      const html = '<form><label for="name">Name</label><input type="text" id="name"></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'form-label');
      expect(violation).toBeUndefined();
      const pass = results.passes.find(p => p.rule === 'form-label');
      expect(pass).toBeDefined();
    });

    it('should pass input wrapped in label', async () => {
      const html = '<form><label>Name <input type="text"></label></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'form-label');
      expect(violation).toBeUndefined();
    });

    it('should pass input with aria-label', async () => {
      const html = '<form><input type="text" aria-label="Email address"></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'form-label');
      expect(violation).toBeUndefined();
    });

    it('should pass input with aria-labelledby', async () => {
      const html = '<form><span id="lbl">Search</span><input type="text" aria-labelledby="lbl"></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'form-label');
      expect(violation).toBeUndefined();
    });

    it('should pass input with title', async () => {
      const html = '<form><input type="text" title="Enter your name"></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'form-label');
      expect(violation).toBeUndefined();
    });

    it('should skip hidden input types', async () => {
      const html = '<form><input type="hidden" name="csrf"></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'form-label');
      expect(violation).toBeUndefined();
    });

    it('should skip submit/button/reset inputs', async () => {
      const html = '<form><input type="submit" value="Go"><input type="reset" value="Clear"></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'form-label');
      expect(violation).toBeUndefined();
    });

    it('should check textarea for label', async () => {
      const html = '<form><textarea></textarea></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'form-label');
      expect(violation).toBeDefined();
    });

    it('should warn when placeholder is used instead of label', async () => {
      const html = '<form><input type="text" placeholder="Enter name"></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'placeholder-label');
      expect(warning).toBeDefined();
    });

    it('should not warn about placeholder when proper label also exists', async () => {
      const html = '<form><label>Name <input type="text" placeholder="e.g. John"></label></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'placeholder-label');
      expect(warning).toBeUndefined();
    });
  });

  describe('Fieldsets', () => {
    it('should detect fieldset without legend', async () => {
      const html = '<fieldset><input type="radio" name="opt" value="a"></fieldset>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'fieldset-legend');
      expect(violation).toBeDefined();
      expect(violation?.impact).toBe('serious');
    });

    it('should detect fieldset with empty legend', async () => {
      const html = '<fieldset><legend>   </legend></fieldset>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'fieldset-legend-empty');
      expect(violation).toBeDefined();
    });

    it('should pass fieldset with proper legend', async () => {
      const html = '<fieldset><legend>Shipping Address</legend></fieldset>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v =>
        v.rule === 'fieldset-legend' || v.rule === 'fieldset-legend-empty'
      );
      expect(violation).toBeUndefined();
      const pass = results.passes.find(p => p.rule === 'fieldset-legend');
      expect(pass).toBeDefined();
    });
  });

  describe('Required inputs', () => {
    it('should warn when required input is missing aria-required', async () => {
      const html = '<form><label>Name <input type="text" required></label></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'required-aria-required');
      expect(warning).toBeDefined();
    });

    it('should not warn when aria-required is present', async () => {
      const html = '<form><label>Name <input type="text" required aria-required="true"></label></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'required-aria-required');
      expect(warning).toBeUndefined();
    });
  });

  describe('Pattern inputs', () => {
    it('should flag input with pattern attribute but no title', async () => {
      const html = '<form><label>Phone <input type="tel" pattern="[0-9]+" aria-label="Phone"></label></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'pattern-title');
      expect(violation).toBeDefined();
      expect(violation?.impact).toBe('serious');
    });

    it('should pass input with pattern and title', async () => {
      const html = '<form><label>Phone <input type="tel" pattern="[0-9]+" title="Numbers only" aria-label="Phone"></label></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'pattern-title');
      expect(violation).toBeUndefined();
    });
  });

  describe('Form accessibility', () => {
    it('should warn about form without submit button', async () => {
      const html = '<form id="myForm"><label>Name <input type="text"></label></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'form-submit');
      expect(warning).toBeDefined();
    });

    it('should not warn when form has submit button', async () => {
      const html = '<form id="myForm"><label>Name <input type="text"></label><button type="submit">Send</button></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'form-submit');
      expect(warning).toBeUndefined();
    });

    it('should warn about form without accessible name', async () => {
      const html = '<form><label>Name <input type="text"></label><button type="submit">Go</button></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'form-name');
      expect(warning).toBeDefined();
    });

    it('should not warn when form has aria-label', async () => {
      const html = '<form aria-label="Contact form"><label>Name <input type="text"></label><button type="submit">Go</button></form>';
      const results = await formsRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'form-name');
      expect(warning).toBeUndefined();
    });
  });
});
