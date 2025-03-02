#!/usr/bin/env node

import { program } from 'commander';
import { scanFile, scanHtml, formatReport, saveReport } from '..';
import { ScannerOptions } from '..';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { URL } from 'url';

// Try to load package.json for version information
let version = '0.1.0'
try {
    const packagePath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    version = packageJson.version;
} catch (e) {
    // Ignore package.json load error
}

program
    .name('wcag-scanner')
    .description('Scan HTML files and websites for WCAG accessibility violations')
    .version(version);

// Command to scan HTML file
program
    .command('scan <filePath>')
    .description('Scan a local HTML file for accessibility violations')
    .option('-l, --level <level>', 'WCAG level (A, AA, AAA)', 'AA')
    .option('-f, --format <format>', 'Output format (json, console, html)', 'console')
    .option('-o, --output <file>', 'Save results to file')
    .option('-v, --verbose', 'Show verbose output')
    .option('-r, --rules <rules>', 'Comma-separated list of rules to check')
    .action(async (filePath, options) => {
        try {
            console.log(`Scanning file: ${filePath}`);
            
            const scannerOptions: ScannerOptions = {
              level: options.level as 'A' | 'AA' | 'AAA',
              verbose: options.verbose || false,
              rules: options.rules ? options.rules.split(',') : undefined
            };
            
            const results = await scanFile(filePath, scannerOptions);
            
            // Generate report
            const report = formatReport(results, options.format, scannerOptions);
            
            // Output to console if not html format
            if (options.format !== 'html') {
              console.log(report);
            }
            
            // Save to file if specified
            if (options.output) {
              console.log(`Saving report to: ${options.output}`);
              saveReport(report, options.output);
            }
            
            // Exit with appropriate code based on violations
            process.exit(results.violations.length > 0 ? 1 : 0);
          } catch (error) {
            console.error('Error scanning file:', error);
            process.exit(1);
          }
    });

// Command to scan URL
program
  .command('url <url>')
  .description('Scan a website URL for accessibility issues')
  .option('-l, --level <level>', 'WCAG level (A, AA, AAA)', 'AA')
  .option('-f, --format <format>', 'Output format (json, console, html)', 'console')
  .option('-o, --output <file>', 'Save results to file')
  .option('-v, --verbose', 'Show verbose output')
  .option('-r, --rules <rules>', 'Comma-separated list of rules to check')
  .action(async (urlString, options) => {
    try {
      // Add protocol if missing
      if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
        urlString = 'https://' + urlString;
        console.log(`Added protocol to URL: ${urlString}`);
      }
      
      console.log(`Scanning URL: ${urlString}`);
      
      // Fetch the URL content
      const html = await fetchUrl(urlString);
      
      const scannerOptions: ScannerOptions = {
        level: options.level as 'A' | 'AA' | 'AAA',
        verbose: options.verbose || false,
        baseUrl: urlString,
        rules: options.rules ? options.rules.split(',') : undefined
      };
      
      const results = await scanHtml(html, scannerOptions);
      
      // Generate report
      const report = formatReport(results, options.format, scannerOptions);
      
      // Output to console if not html format
      if (options.format !== 'html') {
        console.log(report);
      }
      
      // Save to file if specified
      if (options.output) {
        console.log(`Saving report to: ${options.output}`);
        saveReport(report, options.output);
      }
      
      // Exit with appropriate code based on violations
      process.exit(results.violations.length > 0 ? 1 : 0);
    } catch (error) {
      console.error('Error scanning URL:', error);
      process.exit(1);
    }
  });

// Command to scan HTML from stdin
program
  .command('stdin')
  .description('Scan HTML input from stdin')
  .option('-l, --level <level>', 'WCAG level (A, AA, AAA)', 'AA')
  .option('-f, --format <format>', 'Output format (json, console, html)', 'console')
  .option('-o, --output <file>', 'Save results to file')
  .option('-v, --verbose', 'Show verbose output')
  .option('-r, --rules <rules>', 'Comma-separated list of rules to check')
  .action(async (options) => {
    try {
      console.log('Reading HTML from stdin...');
      
      let html = '';
      process.stdin.on('data', (chunk) => {
        html += chunk;
      });
      
      process.stdin.on('end', async () => {
        console.log(`Received ${html.length} bytes of HTML`);
        
        const scannerOptions: ScannerOptions = {
          level: options.level as 'A' | 'AA' | 'AAA',
          verbose: options.verbose || false,
          rules: options.rules ? options.rules.split(',') : undefined
        };
        
        const results = await scanHtml(html, scannerOptions);
        
        // Generate report
        const report = formatReport(results, options.format, scannerOptions);
        
        // Output to console if not html format
        if (options.format !== 'html') {
          console.log(report);
        }
        
        // Save to file if specified
        if (options.output) {
          console.log(`Saving report to: ${options.output}`);
          saveReport(report, options.output);
        }
        
        // Exit with appropriate code based on violations
        process.exit(results.violations.length > 0 ? 1 : 0);
      });
    } catch (error) {
      console.error('Error scanning HTML:', error);
      process.exit(1);
    }
  });

// Helper function to fetch URL content
async function fetchUrl(urlString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(urlString, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Request failed with status code ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.end();
  });
}

// If no arguments provided, show help
if (process.argv.length <= 2) {
  program.help();
}

// Parse command line arguments
program.parse(process.argv);