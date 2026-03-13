/**
 * initWcagOverlay — auto-injects the WCAG Dev Inspector overlay.
 *
 * Call this from any file (js / ts / jsx / tsx) in your app entry point.
 * It is a no-op outside of development (process.env.NODE_ENV !== 'development').
 *
 * @example
 *   // main.ts / index.js / App.tsx — one line is all you need:
 *   import { initWcagOverlay } from 'wcag-scanner/react';
 *   initWcagOverlay();
 *
 *   // With options:
 *   initWcagOverlay({ level: 'AAA', position: 'bottom-left', debounce: 500 });
 */

import type { WcagDevOverlayProps } from './WcagDevOverlay';

export function initWcagOverlay(options: WcagDevOverlayProps = {}): void {
  // Only run in browser + development
  if (typeof window === 'undefined') return;
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;

  const mount = () => {
    // Don't mount twice
    if (document.querySelector('[data-wcag-overlay-root]')) return;

    const container = document.createElement('div');
    container.setAttribute('data-wcag-overlay-root', 'true');
    document.body.appendChild(container);

    // Dynamically import React + ReactDOM to avoid bundling them twice
    Promise.all([
      import('react'),
      import('react-dom'),
      import('./WcagDevOverlay'),
    ]).then(([React, ReactDOM, { WcagDevOverlay }]) => {
      const el = React.createElement(WcagDevOverlay, options as React.ComponentProps<typeof WcagDevOverlay>);

      // React 18: createRoot
      const rdAny = ReactDOM as any;
      if (rdAny.createRoot) {
        rdAny.createRoot(container).render(el);
      } else {
        // React 17 fallback
        rdAny.render(el, container);
      }
    }).catch((err: unknown) => {
      console.warn('[wcag-scanner] Failed to mount overlay:', err);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
}
