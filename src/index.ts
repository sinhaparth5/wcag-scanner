import { WCAGScanner } from "./scanner";
import { ScannerOptions, ScanResults } from "./types";
import fs from "fs";
import path from "path";

/**
 * Scan HTML string for WCAG violations
 * @param html HTML content to scan
 * @param options Scanner options
 * @return Promise<ScanResults> Scan results
 */
export async function scanHTML(html: string, options: ScannerOptions = {}): Promise<ScanResults> {
    const scanner = new WCAGScanner(options);
    await scanner.loadHTML(html);
    return scanner.scan();
}

/**
 * Scan HTML file for WCAG violations
 * @param filePath Path to HTML file
 * @param options Scanner options
 * @return Promise<ScanResults> Scan results
 */
export async function scanFile(filePath: string, options: ScannerOptions = {}): Promise<ScanResults> {
    const html = fs.readFileSync(path.resolve(filePath), 'utf8');
    const baseUrl = options.baseUrl || `file://${path.resolve(filePath)}`;

    const scanner = new WCAGScanner(options);
    await scanner.loadHTML(html, baseUrl);
    return scanner.scan();
}

// Export the scanner class and types
export { WCAGScanner };
export * from "./types";