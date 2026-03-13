/**
 * initWcagOverlay — auto-injects the WCAG Dev Inspector overlay.
 *
 * Call this from any file (js / ts / jsx / tsx) in your app entry point.
 * It is a no-op in production builds.
 *
 * @example
 *   import { initWcagOverlay } from 'wcag-scanner/react';
 *   initWcagOverlay();
 *
 *   // With options:
 *   initWcagOverlay({ level: 'AAA', position: 'bottom-left', debounce: 500 });
 */

import React from 'react';
import { WcagDevOverlay } from './WcagDevOverlay';
import type { WcagDevOverlayProps } from './WcagDevOverlay';

export function initWcagOverlay(options: WcagDevOverlayProps = {}): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;

  const mount = () => {
    if (document.querySelector('[data-wcag-overlay-root]')) return;

    const container = document.createElement('div');
    container.setAttribute('data-wcag-overlay-root', 'true');
    document.body.appendChild(container);

    const el = React.createElement(WcagDevOverlay, options);

    // React 18+: use createRoot from react-dom/client
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createRoot } = require('react-dom/client') as typeof import('react-dom/client');
      createRoot(container).render(el);
      return;
    } catch {
      // react-dom/client not available — React 17
    }

    // React 17 fallback
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ReactDOM = require('react-dom') as any;
      ReactDOM.render(el, container);
    } catch (err) {
      console.warn('[wcag-scanner] Failed to mount overlay:', err);
      document.body.removeChild(container);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
}
