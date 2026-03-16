import { WCAGScanner } from './scanner';
import { ScannerOptions, ScanResults } from './types';
import { generateReport, ReporterFormat } from './reporters';
import middleware from './middleware';
import fs from 'fs';
import path from 'path';
export { FAST_RULES, FULL_RULES, RULE_PRESETS, resolveRuleNames } from './rules/presets';

/**
 * Scan an HTML string for WCAG violations.
 */
export async function scanHtml(html: string, options: ScannerOptions = {}): Promise<ScanResults> {
  const scanner = new WCAGScanner(options);
  await scanner.loadHTML(html);
  return scanner.scan();
}

/**
 * Scan a local HTML file for WCAG violations.
 */
export async function scanFile(filePath: string, options: ScannerOptions = {}): Promise<ScanResults> {
  const html = fs.readFileSync(path.resolve(filePath), 'utf8');
  const baseUrl = options.baseUrl || `file://${path.resolve(filePath)}`;
  const scanner = new WCAGScanner(options);
  await scanner.loadHTML(html, baseUrl);
  return scanner.scan();
}

/**
 * Generate a report from scan results.
 */
export function formatReport(
  results: ScanResults,
  format: ReporterFormat = 'json',
  options: ScannerOptions = {},
): string {
  return generateReport(results, format, options);
}

/**
 * Save a report string to a file.
 */
export function saveReport(report: string, filePath: string): void {
  fs.writeFileSync(filePath, report);
}

export { WCAGScanner };
export * from './types';
export { ReporterFormat };
export { middleware };

export default { scanHtml, scanFile, formatReport, saveReport, middleware };
