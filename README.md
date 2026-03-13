# WCAG Scanner

<div align="center">
  <img src="/imgs/wcag-scanner-logo.png" alt="WCAG Scanner Logo" />
  
  [![npm version](https://img.shields.io/npm/v/wcag-scanner.svg)](https://www.npmjs.com/package/wcag-scanner)
  ![example workflow](https://github.com/sinhaparth5/wcag-scanner/actions/workflows/lint.yml/badge.svg)
  ![example workflow](https://github.com/sinhaparth5/wcag-scanner/actions/workflows/typo-check.yml/badge.svg)
  [![codecov](https://codecov.io/gh/sinhaparth5/wcag-scanner/graph/badge.svg?token=TOJOPXNYGV)](https://codecov.io/gh/sinhaparth5/wcag-scanner)
  [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://github.com/sinhaparth5/wcag-scanner/blob/main/LICENSE)
  ![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/sinhaparth5/wcag-scanner)
  ![GitHub top language](https://img.shields.io/github/languages/top/sinhaparth5/wcag-scanner)
</div>

## 🚀 Overview

WCAG Scanner is a powerful accessibility testing tool that helps developers identify and fix accessibility issues on their websites according to Web Content Accessibility Guidelines (WCAG). It performs automated checks against WCAG 2.1 standards and provides actionable recommendations to improve web accessibility.

![Alt](https://repobeats.axiom.co/api/embed/ea9b7507716a27718ca4869364db5f69100a6bb1.svg "Repobeats analytics image")

<div align="center"><img src="https://codecov.io/gh/sinhaparth5/wcag-scanner/graphs/sunburst.svg?token=TOJOPXNYGV" alt="CodeCov Sunburst" /> </div>

## ✨ Features

- **WCAG 2.1 Compliance Scanning**: Checks against A, AA, and AAA conformance levels
- **6 Built-in Rules**: Images, contrast, forms, ARIA, structure, and keyboard accessibility
- **React Dev Overlay**: Live in-browser inspector with element highlighting, pinning, and impact filtering
- **AI Fix Suggestions**: Paste your Gemini API key in the overlay settings to get instant fix suggestions per violation
- **Programmatic API**: Scan HTML strings or local files from Node.js
- **Express Middleware**: Auto-scan responses in your Express app
- **Multiple Report Formats**: JSON, HTML, and console output

## 📦 Installation

```bash
# npm
npm install wcag-scanner

# yarn
yarn add wcag-scanner

# pnpm
pnpm add wcag-scanner
```

> **React users:** React and React DOM are peer dependencies already in your project — no extra install needed.

## 🖥️ React Dev Overlay

The easiest way to use wcag-scanner in a React app. Add **one line** to your entry file and a live accessibility inspector appears in the corner of your browser during development.

```ts
// main.ts / main.jsx / index.tsx — works with any file type
import { initWcagOverlay } from 'wcag-scanner/react';

initWcagOverlay(); // auto-disabled in production
```

**Options:**
```ts
initWcagOverlay({
  level:    'AA',           // 'A' | 'AA' | 'AAA' — default: 'AA'
  position: 'bottom-right', // 'bottom-right' | 'bottom-left'
  debounce: 750,            // ms to wait after DOM change before rescanning
  rules:    ['images', 'contrast'], // run a subset of rules only
});
```

**Features:**
- Hover over a violation to highlight the element on the page
- Click to pin the highlight; click again to unpin
- Expand any violation card for the HTML snippet, element path, WCAG criteria, and fix hint
- Filter by impact level (critical / serious / moderate / minor)
- Drag the panel anywhere on screen
- Keyboard shortcut `Alt+Shift+W` to toggle open/close
- **⚙ Settings** — paste a free Google Gemini API key to get AI-powered fix suggestions per violation

> The overlay never runs in production (`NODE_ENV=production`) and is never included in your production bundle.

## 🔧 Programmatic API

Scan HTML strings or local files from Node.js scripts, CI pipelines, or build tools.

```js
import { scanHtml, scanFile, formatReport, saveReport } from 'wcag-scanner';

// Scan an HTML string
const results = await scanHtml('<img src="logo.png">', { level: 'AA' });
console.log(`${results.violations.length} violations found`);

// Scan a local HTML file
const results = await scanFile('./public/index.html', { level: 'AA' });

// Generate and save a report
const html = formatReport(results, 'html');   // 'html' | 'json' | 'console'
saveReport(html, 'accessibility-report.html');
```

## 🌐 Express Middleware

Automatically scan every HTML response in your Express app and inject a violation badge.

```js
import express from 'express';
import { middleware } from 'wcag-scanner';

const app = express();

app.use(middleware.express.createMiddleware({
  enabled:      true,
  level:        'AA',
  headerName:   'X-WCAG-Violations', // violation count added to response headers
  inlineReport: true,                // inject a small widget into the HTML response
  onViolation: (results, req) => {
    console.log(`${results.violations.length} issues on ${req.path}`);
  },
}));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html><body><h1>Hello</h1></body></html>`);
});

app.listen(3000);
```