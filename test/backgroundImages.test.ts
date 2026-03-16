import { JSDOM } from 'jsdom';
import backgroundImagesRule from '../src/rules/backgroundImages';

describe('Background Images Rule', () => {
  const createDom = (html: string) => new JSDOM(html, { pretendToBeVisual: true });

  it('should warn when a meaningful background image lacks an alternative', async () => {
    const dom = createDom(`
      <html>
        <body>
          <button style="background-image:url('cta.jpg')"></button>
        </body>
      </html>
    `);

    const results = await backgroundImagesRule.check(dom.window.document, dom.window as unknown as Window, { level: 'AA' });
    expect(results.warnings.some(w => w.rule === 'background-image')).toBe(true);
  });

  it('should skip decorative background containers', async () => {
    const dom = createDom(`
      <html>
        <body>
          <section class="hero" style="background-image:url('hero.jpg')"></section>
        </body>
      </html>
    `);

    const results = await backgroundImagesRule.check(dom.window.document, dom.window as unknown as Window, { level: 'AA' });
    expect(results.warnings.some(w => w.rule === 'background-image')).toBe(false);
  });

  it('should skip hidden and aria-hidden elements', async () => {
    const dom = createDom(`
      <html>
        <body>
          <div hidden style="background-image:url('hidden.jpg')"></div>
          <div aria-hidden="true" style="background-image:url('aria-hidden.jpg')"></div>
        </body>
      </html>
    `);

    const results = await backgroundImagesRule.check(dom.window.document, dom.window as unknown as Window, { level: 'AA' });
    expect(results.warnings.some(w => w.rule === 'background-image')).toBe(false);
  });

  it('should skip elements with background images when they already have text alternatives', async () => {
    const dom = createDom(`
      <html>
        <body>
          <button aria-label="Open menu" style="background-image:url('menu.jpg')"></button>
          <div title="Decorative art" style="background-image:url('art.jpg')"></div>
        </body>
      </html>
    `);

    const results = await backgroundImagesRule.check(dom.window.document, dom.window as unknown as Window, { level: 'AA' });
    expect(results.warnings.some(w => w.rule === 'background-image')).toBe(false);
  });

  it('should ignore non-inspectable elements and non-url backgrounds', async () => {
    const dom = createDom(`
      <html>
        <body>
          <script style="background-image:url('bad.jpg')"></script>
          <div style="background-image:linear-gradient(red, blue)"></div>
        </body>
      </html>
    `);

    const results = await backgroundImagesRule.check(dom.window.document, dom.window as unknown as Window, { level: 'AA' });
    expect(results.warnings.some(w => w.rule === 'background-image')).toBe(false);
  });

  it('should skip elements hidden via CSS visibility/display', async () => {
    const dom = createDom(`
      <html>
        <body>
          <button style="display:none; background-image:url('hidden-display.jpg')"></button>
          <button style="visibility:hidden; background-image:url('hidden-visibility.jpg')"></button>
        </body>
      </html>
    `);

    const results = await backgroundImagesRule.check(dom.window.document, dom.window as unknown as Window, { level: 'AA' });
    expect(results.warnings.some(w => w.rule === 'background-image')).toBe(false);
  });

  it('should skip elements whose own text content makes the image non-actionable', async () => {
    const dom = createDom(`
      <html>
        <body>
          <button style="background-image:url('cta.jpg')">Open menu</button>
        </body>
      </html>
    `);

    const results = await backgroundImagesRule.check(dom.window.document, dom.window as unknown as Window, { level: 'AA' });
    expect(results.warnings.some(w => w.rule === 'background-image')).toBe(false);
  });
});
