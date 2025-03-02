import { WCAGScanner } from './scanner';
import { ScannerOptions, ScanResults } from './types';
import { generateReport, ReporterFormat } from './reporters';
import middleware from './middleware';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import http from 'http';
import https from 'https';

/**
 * Scan HTML string for WCAG violations
 * @param html HTML content to scan
 * @param options Scanner options
 * @returns Promise<ScanResults> Scan results
 */
export async function scanHtml(html: string, options: ScannerOptions = {}): Promise<ScanResults> {
  const scanner = new WCAGScanner(options);
  await scanner.loadHTML(html);
  return scanner.scan();
}

/**
 * Scan HTML file for WCAG violations
 * @param filePath Path to HTML file
 * @param options Scanner options
 * @returns Promise<ScanResults> Scan results
 */
export async function scanFile(filePath: string, options: ScannerOptions = {}): Promise<ScanResults> {
  const html = fs.readFileSync(path.resolve(filePath), 'utf8');
  const baseUrl = options.baseUrl || `file://${path.resolve(filePath)}`;
  
  const scanner = new WCAGScanner(options);
  await scanner.loadHTML(html, baseUrl);
  return scanner.scan();
}

/**
 * Scan a URL for WCAG violations
 * @param urlString URL to scan
 * @param options Scanner options
 * @returns Promise<ScanResults> Scan results 
 */
export async function scanUrl(urlString: string, options: ScannerOptions = {}): Promise<ScanResults> {
  // Add protocol if missing
  if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
    urlString = 'https://' + urlString;
  }
  
  const html = await fetchUrl(urlString);
  const scannerOptions = {
    ...options,
    baseUrl: urlString
  };
  
  return scanHtml(html, scannerOptions);
}

/**
 * Generate a report from scan results
 * @param results Scan results
 * @param format Report format
 * @param options Scanner options
 * @returns Report string
 */
export function formatReport(
  results: ScanResults, 
  format: ReporterFormat = 'json', 
  options: ScannerOptions = {}
): string {
  return generateReport(results, format, options);
}

/**
 * Save report to a file
 * @param report Report string
 * @param filePath Output file path
 */
export function saveReport(report: string, filePath: string): void {
  fs.writeFileSync(filePath, report);
}

/**
 * Helper function to fetch URL content
 * @param urlString URL to fetch
 * @returns Promise<string> HTML content
 */
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

// Export scanner class, types, and other modules
export { WCAGScanner };
export * from './types';
export { ReporterFormat };
export { middleware };

// Default export with all main functions
export default {
  scanHtml,
  scanFile,
  scanUrl,
  formatReport,
  saveReport,
  middleware
};