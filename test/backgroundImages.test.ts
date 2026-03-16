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
});
