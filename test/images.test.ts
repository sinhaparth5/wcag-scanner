import { JSDOM } from 'jsdom';
import imagesRule from '../src/rules/images';

describe('Images Rule', () => {
  // Helper to create a JSDOM document
  const createDocument = (html: string): Document => {
    const dom = new JSDOM(html);
    return dom.window.document;
  };
  
  // Helper to create a window
  const createWindow = (html: string): Window => {
    return new JSDOM(html).window as unknown as Window;
  };

  it('should detect missing alt text on images', async () => {
    const html = `
      <html>
        <body>
          <img src="test.jpg">
        </body>
      </html>
    `;
    
    const document = createDocument(html);
    const window = createWindow(html);
    
    const results = await imagesRule.check(document, window, { level: 'AA' });
    
    expect(results.violations.length).toBeGreaterThan(0);
    const violation = results.violations.find(v => v.rule === 'img-alt');
    expect(violation).toBeDefined();
    expect(violation?.impact).toBe('critical');
  });

  it('should pass when all images have alt text', async () => {
    const html = `
      <html>
        <body>
          <img src="test.jpg" alt="Test image">
        </body>
      </html>
    `;
    
    const document = createDocument(html);
    const window = createWindow(html);
    
    const results = await imagesRule.check(document, window, { level: 'AA' });
    
    const violation = results.violations.find(v => v.rule === 'img-alt');
    expect(violation).toBeUndefined();
    
    const pass = results.passes.find(p => p.rule === 'img-alt');
    expect(pass).toBeDefined();
  });

  it('should warn about empty alt text on non-decorative images', async () => {
    const html = `
      <html>
        <body>
          <img src="important.jpg" alt="">
        </body>
      </html>
    `;
    
    const document = createDocument(html);
    const window = createWindow(html);
    
    const results = await imagesRule.check(document, window, { level: 'AA' });
    
    const warning = results.warnings.find(w => w.rule === 'img-alt-decorative');
    expect(warning).toBeDefined();
  });

  it('should pass empty alt text on decorative images', async () => {
    const html = `
      <html>
        <body>
          <img src="decorative.jpg" alt="" role="presentation">
        </body>
      </html>
    `;
    
    const document = createDocument(html);
    const window = createWindow(html);
    
    const results = await imagesRule.check(document, window, { level: 'AA' });
    
    const pass = results.passes.find(p => p.rule === 'img-alt-decorative');
    expect(pass).toBeDefined();
  });

  it('should warn about generic and overly long alt text', async () => {
    const html = `
      <html>
        <body>
          <img src="logo.jpg" alt="logo">
          <img src="story.jpg" alt="${'a'.repeat(130)}">
        </body>
      </html>
    `;

    const document = createDocument(html);
    const window = createWindow(html);

    const results = await imagesRule.check(document, window, { level: 'AA' });

    expect(results.warnings.some(w => w.rule === 'img-alt-generic')).toBe(true);
    expect(results.warnings.some(w => w.rule === 'img-alt-long')).toBe(true);
  });

  it('should handle SVG accessible name branches', async () => {
    const html = `
      <html>
        <body>
          <svg id="missing-name"></svg>
          <svg id="empty-title"><title> </title></svg>
          <svg id="named" role="img" aria-label="Chart"></svg>
        </body>
      </html>
    `;

    const document = createDocument(html);
    const window = createWindow(html);

    const results = await imagesRule.check(document, window, { level: 'AA' });

    expect(results.violations.some(v => v.rule === 'svg-accessible-name')).toBe(true);
    expect(results.violations.some(v => v.rule === 'svg-title-empty')).toBe(true);
    expect(results.passes.some(p => p.rule === 'svg-accessible-name')).toBe(true);
  });

  it('should detect used and unused image maps', async () => {
    const html = `
      <html>
        <body>
          <map name="unused"><area shape="rect" coords="0,0,10,10" href="/"></map>
          <img src="plan.jpg" usemap="#used">
          <map name="used">
            <area shape="rect" coords="0,0,10,10" href="/" alt="Top left">
            <area shape="rect" coords="10,10,20,20" href="/next">
          </map>
        </body>
      </html>
    `;

    const document = createDocument(html);
    const window = createWindow(html);

    const results = await imagesRule.check(document, window, { level: 'AA' });

    expect(results.warnings.some(w => w.rule === 'map-unused')).toBe(true);
    expect(results.passes.some(p => p.rule === 'area-alt')).toBe(true);
    expect(results.violations.some(v => v.rule === 'area-alt')).toBe(true);
  });

  it('should not include background image warnings in the images rule', async () => {
    const html = `
      <html>
        <body>
          <div style="background-image:url('hero.jpg')"></div>
        </body>
      </html>
    `;

    const document = createDocument(html);
    const window = createWindow(html);

    const results = await imagesRule.check(document, window, { level: 'AA' });

    const warning = results.warnings.find(w => w.rule === 'background-image');
    expect(warning).toBeUndefined();
  });
});
