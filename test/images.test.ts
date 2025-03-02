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
});