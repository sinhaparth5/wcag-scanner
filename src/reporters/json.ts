import { ScanResults, ScannerOptions } from "../types";

/**
 * Format scan results as JSON
 * @param results Scan results object
 * @param options Options used for the scan
 * @return Formatted JSON string
 */
export function format(results: ScanResults, options: ScannerOptions = {}): string {
    const report = {
        summary: {
            violations: results.violations.length,
            warnings: results.warnings.length,
            passes: results.passes.length,
            timestamp: new Date().toISOString(),
            options: {
                level: options.level || 'AA',
                rules: options.rules || [],
            }
        },
        violations: cleanResultItems(results.violations),
        warnings: cleanResultItems(results.warnings),
        passes: cleanResultItems(results.passes),
    };
    return JSON.stringify(report, null, 2);
}

/**
 * Clean result items for better JSON formatting
 * @param items Array of result items
 * @returns Cleaned items
 */
function cleanResultItems(items: any[]): any[] {
    return items.map(item => {
        // Create a clean copy without cicular references
        const cleanItem = { ...item };
        //Format element info for better readability
        if (cleanItem.element) {
            cleanItem.element = {
                ...cleanItem.element,
                // Ensure element properties are serializable
                toString: undefined
            };
        }

        if (cleanItem.snippet && typeof cleanItem.snippet === 'string') {
            cleanItem.snippet = cleanItem.snippet.length > 300
              ? cleanItem.snippet.substring(0, 300) + '...'
              : cleanItem.snippet;
        }
        return cleanItem;
    });
}

export default {
    format,
};