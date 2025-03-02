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

- **Comprehensive Accessibility Testing**: Scans websites against WCAG 2.1 A, AA, and AAA compliance levels
- **Detailed Reports**: Generates comprehensive reports highlighting issues with severity ratings
- **Actionable Recommendations**: Provides specific guidance on how to fix identified issues
- **Integration with Development Workflows**: CI/CD integration via GitHub Actions, GitLab CI, etc.
- **Custom Rule Configuration**: Tailor scanning criteria to your project's specific needs
- **Interactive Dashboard**: Visual representation of accessibility issues with filtering capabilities
- **Performance Optimization**: Minimal impact on development and build processes

## 📦 Installation

### Using npm

```bash
npm i wcag-scanner
```

### Using yarn
```bash
yarn add wcag-scanner
```

## How to use
### CLI Usage Example:

```bash
# Scan a file
npx wcag-scanner file index.html --level AA --format console

# Scan a URL
npx wcag-scanner url https://example.com --format html --output report.html
```

### Express Middleware Usage Example:

```JavaScript
import express from 'express';
import { middleware } from 'wcag-scanner';

const app = express();

// Add the WCAG scanner middleware
app.use(middleware.express.createMiddleware({
  enabled: true,
  level: 'AA',
  headerName: 'X-WCAG-Violations',
  inlineReport: true,
  onViolation: (results, req, res) => {
    console.log(`Found ${results.violations.length} accessibility issues in ${req.path}`);
  }
}));

// Your routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page</title>
      </head>
      <body>
        <h1>Hello World</h1>
        <img src="logo.png"> <!-- Missing alt text will trigger violation -->
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Programmatic API Usage Example:
```JavaScript
import { scanHtml, scanUrl, formatReport } from 'wcag-scanner';

async function checkMyWebsite() {
  try {
    // Scan a URL
    const results = await scanUrl('https://example.com', { level: 'AA' });
    
    console.log(`Found ${results.violations.length} accessibility issues`);
    
    // Generate a report
    const htmlReport = formatReport(results, 'html');
    
    // Save the report
    fs.writeFileSync('accessibility-report.html', htmlReport);
  } catch (error) {
    console.error('Error scanning website:', error);
  }
}

async function checkHtmlString() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test</title>
      </head>
      <body>
        <img src="logo.png"> <!-- Missing alt text -->
      </body>
    </html>
  `;
  
  const results = await scanHtml(html);
  console.log(formatReport(results, 'console'));
}
```