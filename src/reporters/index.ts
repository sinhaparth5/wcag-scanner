import { ScanResults, ScannerOptions } from '../types';
import jsonReporter from './json';
import consoleReporter from './console';
import htmlReporter from './html';

/**
 * Available reporter formats
 */
export type ReporterFormat = 'json' | 'console' | 'html';

/**
 * Generate a report in the specified format
 * @param results Scanner results
 * @param format Report format
 * @param options Scanner options
 * @returns Formatted report string
 */
export function generateReport(
  results: ScanResults, 
  format: ReporterFormat = 'json', 
  options: ScannerOptions = {}
): string {
  switch (format) {
    case 'json':
      return jsonReporter.format(results, options);
    case 'console':
      return consoleReporter.format(results, options);
    case 'html':
      return htmlReporter.format(results, options);
    default:
      // Default to JSON if unknown format
      return jsonReporter.format(results, options);
  }
}

export {
  jsonReporter,
  consoleReporter,
  htmlReporter
};

export default {
  generateReport
};