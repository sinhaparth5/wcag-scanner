import { WCAGScanner } from './scanner';
import { ScannerOptions, ScanResults } from './types';
import { generateReport, ReporterFormat } from './reporters';
import middleware from './middleware';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import http from 'http';
import https from 'https';
import crypto from "crypto";
import os from 'os';

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
 * Get WASM scraper instance 
 */
async function getWasmScraper() {
  try {
    const { default: wasmModule } = await import('./wasm');
    await wasmModule.initialize();
    return wasmModule;
  } catch (error) {
    console.error('Failed to load WASM scraper, falling back to HTTP requests:', error);
    return null;
  }
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
 * Scan a URL for WCAG violations using Rust/WASM scraping
 * @param url URL to scan
 * @param options Scanner options
 * @returns Promise<ScanResults> Scan results
 */
export async function scanUrl(url: string, options: ScannerOptions = {}): Promise<ScanResults> {
  console.log(`Scanning URL: ${url}`);
  
  // Create temp directory for saving content
  const tempDir = path.join(os.tmpdir(), 'wcag-scanner-temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Generate unique file name
  const fileId = crypto.createHash('md5').update(url + Date.now().toString()).digest('hex').substring(0, 10);
  const tempFile = path.join(tempDir, `${fileId}.html`);
  
  try {
    // Get the WASM scraper
    const wasmScraper = await getWasmScraper();
    
    let html: string;
    
    if (wasmScraper) {
      // Use WASM scraper
      html = await wasmScraper.scrapeUrl(url);
    } else {
      // Fallback to simple HTTP request
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WCAG-Scanner/1.0-js'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      html = await response.text();
    }
    
    if (!html || html.trim().length === 0) {
      throw new Error('Scraper returned empty HTML content');
    }
    
    console.log(`Successfully scraped ${html.length} bytes of HTML content`);
    
    // Save content to temp file
    fs.writeFileSync(tempFile, html);
    console.log(`Saved scraped content to ${tempFile}`);
    
    // If verbose logging is enabled, show a sample
    if (options.verbose) {
      console.log('First 200 characters of HTML:');
      console.log(html.substring(0, 200) + '...');
    }
    
    // Run the scanner on the HTML content
    const scanner = new WCAGScanner({
      ...options,
      baseUrl: url
    });
    
    await scanner.loadHTML(html, url);
    return scanner.scan();
  } catch (error) {
    console.error('Error scanning URL:', error);
    throw error;
  }
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