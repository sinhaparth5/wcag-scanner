import { JSDOM } from 'jsdom';
import contrastRule from '../src/rules/contrast';

// Note: JSDOM does not compute CSS stylesheets, so getComputedStyle only reflects
// inline styles. These tests use inline styles to exercise the contrast logic.

const createDocAndWin = (html: string) => {
  const dom = new JSDOM(html);
  return {
    document: dom.window.document,
    window: dom.window as unknown as Window,
  };
};

describe('Contrast Rule', () => {
  describe('Skips empty or hidden elements', () => {
    it('should skip elements with no text content', async () => {
      const html = '<html><body><p style="color: rgb(255,255,255)"></p></body></html>';
      const { document, window } = createDocAndWin(html);
      const results = await contrastRule.check(document, window, { level: 'AA' });
      // Empty p has no text, should not generate violations or passes
      expect(results.violations.filter(v => v.rule === 'color-contrast')).toHaveLength(0);
    });

    it('should skip elements with aria-hidden', async () => {
      const html = '<html><body><p aria-hidden="true" style="color: rgb(200,200,200)">hidden text</p></body></html>';
      const { document, window } = createDocAndWin(html);
      const results = await contrastRule.check(document, window, { level: 'AA' });
      expect(results.violations.filter(v => v.rule === 'color-contrast')).toHaveLength(0);
    });
  });

  describe('Contrast violations', () => {
    it('should flag white text on white background (ratio 1:1)', async () => {
      const html = '<html><body style="background-color: rgb(255,255,255)"><p style="color: rgb(255,255,255)">invisible text</p></body></html>';
      const { document, window } = createDocAndWin(html);
      const results = await contrastRule.check(document, window, { level: 'AA' });
      const violation = results.violations.find(v => v.rule === 'color-contrast');
      expect(violation).toBeDefined();
      expect(violation?.impact).toBe('serious');
      expect(violation?.fix?.code).toBeDefined();
    });

    it('should flag light grey text on white (ratio ~1.6:1)', async () => {
      const html = '<html><body style="background-color: rgb(255,255,255)"><p style="color: rgb(200,200,200)">low contrast</p></body></html>';
      const { document, window } = createDocAndWin(html);
      const results = await contrastRule.check(document, window, { level: 'AA' });
      const violation = results.violations.find(v => v.rule === 'color-contrast');
      expect(violation).toBeDefined();
    });
  });

  describe('Contrast passes', () => {
    it('should pass black text on white background (ratio 21:1)', async () => {
      const html = '<html><body style="background-color: rgb(255,255,255)"><p style="color: rgb(0,0,0)">good contrast</p></body></html>';
      const { document, window } = createDocAndWin(html);
      const results = await contrastRule.check(document, window, { level: 'AA' });
      const pass = results.passes.find(p => p.rule === 'color-contrast');
      expect(pass).toBeDefined();
    });

    it('should parse named, hex and rgba colors and pass large bold text', async () => {
      const html = `
        <html>
          <body style="background-color: #ffffff">
            <p style="color: black">named color</p>
            <p style="color: #000">hex color</p>
            <p style="color: rgba(0, 0, 0, 0.8); font-size: 19px; font-weight: bold">large bold text</p>
          </body>
        </html>
      `;
      const { document, window } = createDocAndWin(html);
      const results = await contrastRule.check(document, window, { level: 'AA' });

      expect(results.passes.filter(p => p.rule === 'color-contrast').length).toBeGreaterThanOrEqual(3);
    });

    it('should parse long hex colors and other named colors', async () => {
      const html = `
        <html>
          <body style="background-color: white">
            <p style="color: #000000">long hex</p>
            <p style="color: blue">named blue</p>
          </body>
        </html>
      `;
      const { document, window } = createDocAndWin(html);
      const results = await contrastRule.check(document, window, { level: 'A' });
      expect(results.passes.filter(p => p.rule === 'color-contrast').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('WCAG levels', () => {
    it('should reference 1.4.3 for AA violations and 1.4.6 for AAA violations', async () => {
      // rgb(120,120,120) on white ≈ 4.4:1 — fails AA (requires 4.5:1) and AAA (requires 7:1)
      const html = '<html><body style="background-color: rgb(255,255,255)"><p style="color: rgb(120,120,120)">low contrast</p></body></html>';
      const { document: docAA, window: winAA } = createDocAndWin(html);
      const { document: docAAA, window: winAAA } = createDocAndWin(html);

      const resultsAA = await contrastRule.check(docAA, winAA, { level: 'AA' });
      const resultsAAA = await contrastRule.check(docAAA, winAAA, { level: 'AAA' });

      // AA violation should reference 1.4.3
      const aaViolation = resultsAA.violations.find(v => v.rule === 'color-contrast');
      expect(aaViolation).toBeDefined();
      expect(aaViolation?.wcag).toContain('1.4.3');

      // AAA violation should reference 1.4.6
      const aaaViolation = resultsAAA.violations.find(v => v.rule === 'color-contrast');
      expect(aaaViolation).toBeDefined();
      expect(aaaViolation?.wcag).toContain('1.4.6');
    });
  });

  describe('Fallback handling', () => {
    it('should default background color to white when ancestors are transparent', async () => {
      const html = `
        <html>
          <body>
            <div style="background-color: transparent">
              <p style="color: #777">transparent ancestry</p>
            </div>
          </body>
        </html>
      `;
      const { document, window } = createDocAndWin(html);
      const results = await contrastRule.check(document, window, { level: 'AA' });
      expect(results.violations.some(v => v.rule === 'color-contrast')).toBe(true);
    });

    it('should treat unknown colors as insufficient contrast', async () => {
      const html = '<html><body><p style="color: currentColor">unknown parse</p></body></html>';
      const { document, window } = createDocAndWin(html);
      const results = await contrastRule.check(document, window, { level: 'AA' });
      expect(results.violations.some(v => v.rule === 'color-contrast')).toBe(true);
    });

    it('should skip elements when computed colors are unavailable', async () => {
      const html = '<html><body><p>sample text</p></body></html>';
      const { document, window } = createDocAndWin(html);
      const original = window.getComputedStyle.bind(window);

      jest.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => {
        const style = original(element);
        if (element.tagName === 'P') {
          return {
            ...style,
            color: '',
            backgroundColor: '',
          } as CSSStyleDeclaration;
        }
        return style;
      });

      const results = await contrastRule.check(document, window, { level: 'AA' });
      expect(results.violations.some(v => v.rule === 'color-contrast')).toBe(false);
      expect(results.passes.some(p => p.rule === 'color-contrast')).toBe(false);
    });
  });
});
