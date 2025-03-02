import { WCAGScanner } from './scanner';
import { ScannerOptions, ScanResults } from './types';
import { generateReport, ReporterFormat } from './reporters';
import fs from 'fs';
import path from 'path';

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

// Export the scanner class and types
export { WCAGScanner };
export * from './types';
export { ReporterFormat };