import { JSDOM } from 'jsdom';
import keyboardRule from '../src/rules/keyboard';

const createDoc = (html: string) => new JSDOM(html).window.document;
const createWin = (html: string) => new JSDOM(html).window as unknown as Window;

describe('Keyboard Rule', () => {
  describe('Tabindex', () => {
    it('should warn about positive tabindex', async () => {
      const html = '<div tabindex="1">focusable</div>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'tabindex-positive');
      expect(warning).toBeDefined();
      expect(warning?.description).toContain('1');
    });

    it('should not warn for tabindex="0"', async () => {
      const html = '<div role="button" tabindex="0">click</div>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'tabindex-positive');
      expect(warning).toBeUndefined();
    });

    it('should warn about non-interactive element made focusable without role', async () => {
      const html = '<div tabindex="0">not interactive</div>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'tabindex-non-interactive');
      expect(warning).toBeDefined();
    });

    it('should not warn when non-interactive element has an interactive role', async () => {
      const html = '<div role="button" tabindex="0">button-like</div>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'tabindex-non-interactive');
      expect(warning).toBeUndefined();
    });

    it('should not warn for natively focusable elements', async () => {
      const html = '<button tabindex="0">click</button>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'tabindex-non-interactive');
      expect(warning).toBeUndefined();
    });
  });

  describe('Keyboard events', () => {
    it('should warn about div with onclick but no keyboard handler', async () => {
      const html = '<div onclick="doSomething()">click me</div>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'keyboard-event-equivalents');
      expect(warning).toBeDefined();
    });

    it('should not warn when keyboard handler accompanies click', async () => {
      const html = '<div onclick="doSomething()" onkeydown="doSomething()">click me</div>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'keyboard-event-equivalents');
      expect(warning).toBeUndefined();
    });

    it('should not warn for native button with onclick', async () => {
      const html = '<button onclick="doSomething()">click</button>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'keyboard-event-equivalents');
      expect(warning).toBeUndefined();
    });

    it('should not warn for anchor with onclick', async () => {
      const html = '<a href="#" onclick="doSomething()">link</a>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'keyboard-event-equivalents');
      expect(warning).toBeUndefined();
    });
  });

  describe('Interactive elements', () => {
    it('should detect div with onclick lacking role', async () => {
      const html = '<div onclick="go()" tabindex="0">fake button</div>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'interactive-semantics');
      expect(violation).toBeDefined();
    });

    it('should not flag div with onclick and role=button', async () => {
      const html = '<div onclick="go()" role="button" tabindex="0">button</div>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const violation = results.violations.find(v => v.rule === 'interactive-semantics');
      expect(violation).toBeUndefined();
    });

    it('should warn about link opening in new window without indication', async () => {
      const html = '<a href="https://example.com" target="_blank">Visit site</a>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'link-new-window');
      expect(warning).toBeDefined();
    });

    it('should not warn when link indicates new window in text', async () => {
      const html = '<a href="https://example.com" target="_blank">Visit site (opens in new window)</a>';
      const results = await keyboardRule.check(createDoc(html), createWin(html), {});
      const warning = results.warnings.find(w => w.rule === 'link-new-window');
      expect(warning).toBeUndefined();
    });
  });
});
