import { JSDOM } from 'jsdom';

describe('initWcagOverlay', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalProcess = global.process;

  let dom: JSDOM | null = null;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    dom = new JSDOM('<!doctype html><html><body></body></html>', {
      pretendToBeVisual: true,
      url: 'https://example.org',
    });

    global.window = dom.window as unknown as Window & typeof globalThis;
    global.document = dom.window.document;
    global.process = { ...originalProcess, env: { ...originalProcess.env, NODE_ENV: 'development' } };
  });

  afterEach(() => {
    jest.dontMock('react-dom/client');
    jest.dontMock('react-dom');
    dom?.window.close();
    dom = null;
    global.window = originalWindow;
    global.document = originalDocument;
    global.process = originalProcess;
  });

  it('mounts the overlay immediately when the document is ready', async () => {
    const mockRender = jest.fn();
    const mockCreateRoot = jest.fn((container?: unknown) => ({ render: mockRender, container }));

    jest.doMock('react-dom/client', () => ({
      createRoot: (container: unknown) => mockCreateRoot(container),
    }));

    const { initWcagOverlay } = await import('../src/react/init');
    initWcagOverlay({ preset: 'full' });

    const container = document.querySelector('[data-wcag-overlay-root="true"]');
    expect(container).not.toBeNull();
    expect(mockCreateRoot).toHaveBeenCalledWith(container);
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it('does not mount twice if called repeatedly', async () => {
    const mockRender = jest.fn();
    const mockCreateRoot = jest.fn((container?: unknown) => ({ render: mockRender, container }));

    jest.doMock('react-dom/client', () => ({
      createRoot: (container: unknown) => mockCreateRoot(container),
    }));

    const { initWcagOverlay } = await import('../src/react/init');
    initWcagOverlay();
    initWcagOverlay();

    expect(document.querySelectorAll('[data-wcag-overlay-root="true"]')).toHaveLength(1);
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it('does nothing in production', async () => {
    global.process = { ...originalProcess, env: { ...originalProcess.env, NODE_ENV: 'production' } };

    const { initWcagOverlay } = await import('../src/react/init');
    initWcagOverlay();

    expect(document.querySelector('[data-wcag-overlay-root="true"]')).toBeNull();
  });

  it('falls back to react-dom render when react-dom/client is unavailable', async () => {
    const mockRender = jest.fn();

    jest.doMock('react-dom/client', () => {
      throw new Error('missing client');
    });
    jest.doMock('react-dom', () => ({
      render: mockRender,
    }));

    const { initWcagOverlay } = await import('../src/react/init');
    initWcagOverlay();

    const container = document.querySelector('[data-wcag-overlay-root="true"]');
    expect(container).not.toBeNull();
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it('waits for DOMContentLoaded when the document is still loading', async () => {
    const mockRender = jest.fn();
    const mockCreateRoot = jest.fn((container?: unknown) => ({ render: mockRender, container }));

    jest.doMock('react-dom/client', () => ({
      createRoot: (container: unknown) => mockCreateRoot(container),
    }));

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'loading',
    });

    const { initWcagOverlay } = await import('../src/react/init');
    initWcagOverlay();

    expect(document.querySelector('[data-wcag-overlay-root="true"]')).toBeNull();

    document.dispatchEvent(new dom!.window.Event('DOMContentLoaded'));

    expect(document.querySelector('[data-wcag-overlay-root="true"]')).not.toBeNull();
    expect(mockRender).toHaveBeenCalledTimes(1);
  });
});
