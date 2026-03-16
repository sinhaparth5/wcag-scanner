import React from 'react';
import { JSDOM } from 'jsdom';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { WcagDevOverlay } from '../src/react/WcagDevOverlay';
import type { BrowserScanResults } from '../src/react/browserScanner';

const mockScanBrowserPage = jest.fn<Promise<BrowserScanResults>, []>();

jest.mock('../src/react/browserScanner', () => ({
  scanBrowserPage: () => mockScanBrowserPage(),
}));

jest.mock('../src/react/gemini', () => ({
  getAiSuggestion: jest.fn(),
  getStoredApiKey: () => '',
  setStoredApiKey: jest.fn(),
}));

describe('WcagDevOverlay', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalNavigator = global.navigator;
  const originalStorage = global.sessionStorage;
  const originalLocalStorage = global.localStorage;
  const originalGetComputedStyle = global.getComputedStyle;
  const originalRaf = global.requestAnimationFrame;
  const originalCancelRaf = global.cancelAnimationFrame;

  let dom: JSDOM | null = null;
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let target: HTMLElement | null = null;

  const nextTick = async () => {
    await act(async () => {
      await Promise.resolve();
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  };

  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body><button id="target">Target</button></body></html>', {
      pretendToBeVisual: true,
      url: 'https://example.org',
    });

    global.window = dom.window as unknown as Window & typeof globalThis;
    global.document = dom.window.document;
    global.navigator = dom.window.navigator;
    global.sessionStorage = dom.window.sessionStorage;
    global.localStorage = dom.window.localStorage;
    global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
    global.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
    global.cancelAnimationFrame = (id: number) => clearTimeout(id);

    target = dom.window.document.getElementById('target') as HTMLElement;
    target.scrollIntoView = jest.fn();
    target.getBoundingClientRect = () => ({
      x: 20,
      y: 40,
      top: 40,
      left: 20,
      right: 120,
      bottom: 80,
      width: 100,
      height: 40,
      toJSON: () => ({}),
    });

    container = dom.window.document.createElement('div');
    dom.window.document.body.appendChild(container);
    root = createRoot(container);
    mockScanBrowserPage.mockReset();
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }
    dom?.window.close();
    root = null;
    container = null;
    dom = null;
    target = null;
    global.window = originalWindow;
    global.document = originalDocument;
    global.navigator = originalNavigator;
    global.sessionStorage = originalStorage;
    global.localStorage = originalLocalStorage;
    global.getComputedStyle = originalGetComputedStyle;
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCancelRaf;
  });

  it('renders initial results and updates them on rescan', async () => {
    mockScanBrowserPage
      .mockResolvedValueOnce({
        violations: [{
          rule: 'img-alt',
          impact: 'critical',
          description: 'Missing alt text',
          domElement: target!,
        }],
        warnings: [],
        passes: [],
        duration: 10,
      })
      .mockResolvedValueOnce({
        violations: [],
        warnings: [{
          rule: 'img-alt-decorative',
          impact: 'moderate',
          description: 'Potential decorative image',
          domElement: target!,
        }],
        passes: [],
        duration: 8,
      });

    await act(async () => {
      root!.render(<WcagDevOverlay />);
    });
    await nextTick();

    const textBefore = dom!.window.document.body.textContent || '';
    expect(textBefore).toContain('1 issues');
    expect(textBefore).toContain('Violations (1)');

    const buttons = Array.from(dom!.window.document.querySelectorAll('button'));
    const rescan = buttons.find(button => button.textContent?.includes('Rescan'));
    expect(rescan).toBeDefined();

    await act(async () => {
      rescan!.dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true }));
    });
    await nextTick();

    const textAfter = dom!.window.document.body.textContent || '';
    expect(textAfter).toContain('Warnings (1)');
    expect(textAfter).not.toContain('Violations (1)');
  });

  it('shows the highlight layer when a violation is pinned', async () => {
    mockScanBrowserPage.mockResolvedValue({
      violations: [{
        rule: 'img-alt',
        impact: 'critical',
        description: 'Missing alt text',
        domElement: target!,
      }],
      warnings: [],
      passes: [],
      duration: 12,
    });

    await act(async () => {
      root!.render(<WcagDevOverlay />);
    });
    await nextTick();

    const issueToggle = Array.from(dom!.window.document.querySelectorAll('button'))
      .find(button => button.textContent === '▼');
    expect(issueToggle).toBeDefined();

    await act(async () => {
      issueToggle!.dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true }));
    });
    await nextTick();

    const card = Array.from(dom!.window.document.querySelectorAll('div'))
      .find(div => div.textContent?.includes('Missing alt text'));
    expect(card).toBeDefined();

    await act(async () => {
      card!.dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true }));
    });
    await nextTick();

    const highlight = dom!.window.document.getElementById('wcag-dev-highlight');
    expect(highlight).not.toBeNull();
    expect(highlight?.style.display).toBe('block');
    expect(highlight?.textContent).toContain('Pinned button#target');
    expect(target?.scrollIntoView).toHaveBeenCalled();
  });

  it('lets the user switch scan presets from settings', async () => {
    mockScanBrowserPage
      .mockResolvedValueOnce({
        violations: [],
        warnings: [],
        passes: [],
        duration: 5,
      })
      .mockResolvedValueOnce({
        violations: [],
        warnings: [],
        passes: [],
        duration: 6,
      });

    await act(async () => {
      root!.render(<WcagDevOverlay />);
    });
    await nextTick();

    const settingsButton = Array.from(dom!.window.document.querySelectorAll('button'))
      .find(button => button.getAttribute('title') === 'Settings');
    expect(settingsButton).toBeDefined();

    await act(async () => {
      settingsButton!.dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true }));
    });
    await nextTick();

    const presetSelect = Array.from(dom!.window.document.querySelectorAll('select'))
      .find(select => (select as HTMLSelectElement).value === 'fast') as HTMLSelectElement | undefined;
    expect(presetSelect).toBeDefined();

    await act(async () => {
      presetSelect!.value = 'full';
      presetSelect!.dispatchEvent(new dom!.window.Event('change', { bubbles: true }));
    });
    await nextTick();

    expect(mockScanBrowserPage).toHaveBeenLastCalledWith(expect.objectContaining({ preset: 'full' }));
  });
});
