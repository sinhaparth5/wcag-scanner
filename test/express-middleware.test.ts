import { createMiddleware } from '../src/middleware/express';
import { WCAGScanner } from '../src/index';

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

  it('should bypass non-html responses', async () => {
    const middleware = createMiddleware({ enabled: true, headerName: 'X-WCAG-Violations' });
    const req = createReq();
    const { res, sentBodies, headers } = createRes('application/json');
    const next = jest.fn();

    await middleware(req as never, res as never, next as never);
    res.send('{"ok":true}');

    expect(sentBodies).toEqual(['{"ok":true}']);
    expect(headers['X-WCAG-Violations']).toBeUndefined();
  });

  it('should bypass plain text bodies even on html responses', async () => {
    const middleware = createMiddleware({ enabled: true, headerName: 'X-WCAG-Violations' });
    const req = createReq();
    const { res, sentBodies, headers } = createRes();
    const next = jest.fn();

    await middleware(req as never, res as never, next as never);
    res.send('hello world');

    expect(sentBodies).toEqual(['hello world']);
    expect(headers['X-WCAG-Violations']).toBeUndefined();
  });

  it('should fall back to the original response when scanning fails', async () => {
    const middleware = createMiddleware({ enabled: true, headerName: 'X-WCAG-Violations', rules: ['images'] });
    const req = createReq();
    const { res, sentBodies, headers } = createRes();
    const next = jest.fn();
    const spy = jest.spyOn(WCAGScanner.prototype, 'loadHTML').mockRejectedValue(new Error('boom'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await middleware(req as never, res as never, next as never);
    res.send('<html><body><img src="a.jpg"></body></html>');

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(sentBodies).toHaveLength(1);
    expect(sentBodies[0]).toContain('<img src="a.jpg">');
    expect(headers['X-WCAG-Violations']).toBeUndefined();

    spy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should skip non-GET requests', async () => {
    const middleware = createMiddleware({ enabled: true, headerName: 'X-WCAG-Violations' });
    const req = createReq({ method: 'POST' });
    const { res } = createRes();
    const next = jest.fn();

    await middleware(req as never, res as never, next as never);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should skip API routes', async () => {
    const middleware = createMiddleware({ enabled: true, headerName: 'X-WCAG-Violations' });
    const req = createReq({ path: '/api/health' });
    const { res } = createRes();
    const next = jest.fn();

    await middleware(req as never, res as never, next as never);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should skip requests that do not accept html', async () => {
    const middleware = createMiddleware({ enabled: true, headerName: 'X-WCAG-Violations' });
    const req = createReq({ headers: { accept: 'application/json' } });
    const { res } = createRes();
    const next = jest.fn();

    await middleware(req as never, res as never, next as never);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
