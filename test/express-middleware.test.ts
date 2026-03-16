import { createMiddleware } from '../src/middleware/express';

describe('express middleware', () => {
  function createReq(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      method: 'GET',
      path: '/',
      headers: { accept: 'text/html' },
      ...overrides,
    };
  }

  function createRes(contentType = 'text/html') {
    const headers: Record<string, string> = { 'Content-Type': contentType };
    const sentBodies: string[] = [];

    const res = {
      send(body: string) {
        sentBodies.push(body);
        return this;
      },
      get(name: string) {
        return headers[name] || headers[name.toLowerCase()] || '';
      },
      setHeader(name: string, value: string) {
        headers[name] = value;
      },
    };

    return { res, headers, sentBodies };
  }

  it('should not intercept responses when no output options are enabled', async () => {
    const middleware = createMiddleware({ enabled: true });
    const req = createReq();
    const { res, sentBodies, headers } = createRes();
    const next = jest.fn();

    await middleware(req as never, res as never, next as never);

    expect(next).toHaveBeenCalled();
    res.send('<html><body><img src="a.jpg"></body></html>');

    expect(sentBodies).toHaveLength(1);
    expect(sentBodies[0]).toContain('<img src="a.jpg">');
    expect(headers['X-WCAG-Violations']).toBeUndefined();
  });

  it('should add a violation header when headerName is configured', async () => {
    const middleware = createMiddleware({ enabled: true, headerName: 'X-WCAG-Violations', rules: ['images'] });
    const req = createReq();
    const { res, sentBodies, headers } = createRes();
    const next = jest.fn();

    await middleware(req as never, res as never, next as never);
    res.send('<html><body><img src="a.jpg"></body></html>');

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(sentBodies).toHaveLength(1);
    expect(headers['X-WCAG-Violations']).toBe('1');
  });

  it('should inject the inline report when enabled', async () => {
    const middleware = createMiddleware({ enabled: true, inlineReport: true, rules: ['images'] });
    const req = createReq();
    const { res, sentBodies } = createRes();
    const next = jest.fn();

    await middleware(req as never, res as never, next as never);
    res.send('<html><body><img src="a.jpg"></body></html>');

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(sentBodies).toHaveLength(1);
    expect(sentBodies[0]).toContain('wcag-scanner-report');
  });
});
