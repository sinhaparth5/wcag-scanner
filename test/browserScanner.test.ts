import { JSDOM } from 'jsdom';
import { scanBrowserPage, getElementPath, getNthChildSelector, findBySnippet, findElement } from '../src/react/browserScanner';

describe('browserScanner', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalCss = global.CSS;
  const originalGetComputedStyle = global.getComputedStyle;
  let dom: JSDOM | null = null;

  afterEach(() => {
    dom?.window.close();
    dom = null;
    global.window = originalWindow;
    global.document = originalDocument;
    global.CSS = originalCss;
    global.getComputedStyle = originalGetComputedStyle;
  });

  function installDom(html: string): Document {
    dom = new JSDOM(html, { pretendToBeVisual: true, url: 'https://example.org' });
    global.window = dom.window as unknown as Window & typeof globalThis;
    global.document = dom.window.document;
    global.CSS = {
      escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&'),
    } as unknown as typeof global.CSS;
    global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
    return dom.window.document;
  }

  it('should ignore violations from the overlay DOM', async () => {
    installDom(`
      <html>
        <body>
          <img id="page-image" src="page.jpg">
          <div data-wcag-overlay-root="true">
            <div data-wcag-overlay="true">
              <img id="overlay-image" src="overlay.jpg">
            </div>
          </div>
        </body>
      </html>
    `);

    const results = await scanBrowserPage({ rules: ['images'] });

    expect(results.violations).toHaveLength(1);
    expect(results.violations[0].element?.id).toBe('page-image');
  });

  it('should build selectors and labels for elements', () => {
    const document = installDom(`
      <html>
        <body>
          <main>
            <section class="hero">
              <button id="cta">Press</button>
            </section>
          </main>
        </body>
      </html>
    `);

    const button = document.getElementById('cta');
    expect(button).not.toBeNull();

    const selector = getNthChildSelector(button!);
    const label = getElementPath(button!);

    expect(selector).toBe('#cta');
    expect(label).toContain('main');
    expect(label).toContain('section.hero');
    expect(label).toContain('button#cta');
  });

  it('should resolve elements from snippet attributes', () => {
    const document = installDom(`
      <html>
        <body>
          <img src="hero.jpg" class="banner-image">
          <a href="/docs" class="doc-link">Docs</a>
          <input name="email">
          <button class="cta primary">Press</button>
        </body>
      </html>
    `);

    expect(findBySnippet('<img src="hero.jpg">', document)?.tagName).toBe('IMG');
    expect(findBySnippet('<a href="/docs">Docs</a>', document)?.tagName).toBe('A');
    expect(findBySnippet('<input name="email">', document)?.tagName).toBe('INPUT');
    expect(findBySnippet('<button class="cta primary">Press</button>', document)?.tagName).toBe('BUTTON');
    expect(findBySnippet('<button>Press</button>', document)?.tagName).toBe('BUTTON');
  });

  it('should resolve elements from ids and class selectors in violation metadata', () => {
    const document = installDom(`
      <html>
        <body>
          <div id="hero-panel"></div>
          <button class="cta primary">Click</button>
        </body>
      </html>
    `);

    const byId = findElement({
      rule: 'test',
      impact: 'serious',
      description: 'By id',
      element: { id: 'hero-panel' },
    }, document);

    const byClass = findElement({
      rule: 'test',
      impact: 'serious',
      description: 'By class',
      element: { tagName: 'button', className: 'cta primary' },
    }, document);

    expect(byId?.id).toBe('hero-panel');
    expect(byClass?.tagName).toBe('BUTTON');
  });
});
