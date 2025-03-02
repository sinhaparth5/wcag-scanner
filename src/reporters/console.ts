import { ScanResults, ScannerOptions, Violation, Warning, Pass } from "../types";

// Node only imports
let chalk: any;
try {
    // try to load chalk for terminal colors (@todo will fail in browser environments)
    chalk = require('chalk');
} catch (e) {
    // Mock chalk if it's not available
    chalk = {
        bold: (text: string) => text,
        red: (text: string) => text,
        green: (text: string) => text,
        yellow: (text: string) => text,
        blue: (text: string) => text,
        grey: (text: string) => text,
        cyan: (text: string) => text,
        white: (text: string) => text,
    }
}

/**
 * Format scan results for console output
 * @param results Scanner results object
 * @param options Options used for the scan
 * @returns Formatted console output string
 */
export function format(results: ScanResults, options: ScannerOptions = {}): string {
    const { violations, warnings, passes } = results;
    let output = '\n';

    // Summary section
    output += chalk.bold('WCAG Accessibility Scan Results\n');
    output += chalk.grey('-'.repeat(50) + '\n');
    output += `${chalk.green(`✓ Passes: ${passes.length}`)}`;
    output += `${chalk.yellow(`⚠ Warnings: ${warnings.length}`)}`;
    output += `${chalk.red(`✗ Violations: ${violations.length}`)}`;
    output += chalk.grey('-'.repeat(50) + '\n\n');

    // Group violations by impact
    if (violations.length > 0) {
        output += chalk.bold.red('VIOLATIONS\n');

        // Group violations by imopact
        const impactGroups: Record<string, Violation[]> = groupByImpact(violations);

        // Display violations by impact level (most severe first)
        const impactOrder = ['critical', 'serious', 'moderate', 'minor'];

        impactOrder.forEach(impact => {
            if (impactGroups[impact] && impactGroups[impact].length > 0) {
                output += chalk.bold(`\n${getImpactIcon(impact)} ${impact.toUpperCase()} (${impactGroups[impact].length})`);

                impactGroups[impact].forEach((violation, index) => {
                    output += formatViolation(violation, index + 1, options.verbose);
                });
            }
        });
    }

    // Warning section
    if (warnings.length > 0) {
        output += chalk.bold.yellow('\nWARNINGS\n');
        
        warnings.forEach((warning, index) => {
            output += formatWarning(warning, index + 1, options.verbose);
        });
    }

    // Passes section (only if verbose)
  if (passes.length > 0 && options.verbose) {
    output += chalk.bold.green('\nPASSES\n');
    
    passes.forEach((pass, index) => {
      output += formatPass(pass, index + 1);
    });
  }
  
  return output;
}

/**
 * Group violations by impact level
 * @param violations Array of violations
 * @returns Object with violations grouped by impact
 */
function groupByImpact(violations: Violation[]): Record<string, Violation[]> {
    return violations.reduce((groups: Record<string, Violation[]>, violation) => {
      const impact = violation.impact || 'minor';
      if (!groups[impact]) {
        groups[impact] = [];
      }
      groups[impact].push(violation);
      return groups;
    }, {});
  }
  
  /**
   * Format a single violation for console output
   * @param violation Violation object
   * @param index Violation number
   * @param verbose Show verbose details
   * @returns Formatted violation string
   */
  function formatViolation(violation: Violation, index: number, verbose = false): string {
    let output = '';
    
    // Basic info
    output += chalk.red(`\n${index}. ${violation.description}\n`);
    
    // WCAG criteria
    if (violation.wcag && violation.wcag.length > 0) {
      output += chalk.gray(`   WCAG: ${violation.wcag.join(', ')}\n`);
    }
    
    // Element info
    if (violation.element) {
      const element = violation.element;
      output += chalk.gray(`   Element: ${element.tagName || 'unknown'}` + 
                        (element.id ? ` #${element.id}` : '') + 
                        (element.className ? ` .${element.className}` : '') + '\n');
    }
    
    // Code snippet (if verbose)
    if (violation.snippet && verbose) {
      output += chalk.gray(`   Code: ${formatCodeSnippet(violation.snippet)}\n`);
    }
    
    // Help text
    if (violation.help) {
      output += chalk.gray(`   Help: ${violation.help}\n`);
    }
    
    // Fix suggestion
    if (violation.fix) {
      output += chalk.green(`   Fix: ${violation.fix.description}\n`);
    }
    
    return output;
  }
  
  /**
   * Format a single warning for console output
   * @param warning Warning object
   * @param index Warning number
   * @param verbose Show verbose details
   * @returns Formatted warning string
   */
  function formatWarning(warning: Warning, index: number, verbose = false): string {
    let output = '';
    
    // Basic info
    output += chalk.yellow(`\n${index}. ${warning.description}\n`);
    
    // WCAG criteria
    if (warning.wcag && warning.wcag.length > 0) {
      output += chalk.gray(`   WCAG: ${warning.wcag.join(', ')}\n`);
    }
    
    // Element info
    if (warning.element) {
      const element = warning.element;
      output += chalk.gray(`   Element: ${element.tagName || 'unknown'}` + 
                        (element.id ? ` #${element.id}` : '') + 
                        (element.className ? ` .${element.className}` : '') + '\n');
    }
    
    // Code snippet (if verbose)
    if (warning.snippet && verbose) {
      output += chalk.gray(`   Code: ${formatCodeSnippet(warning.snippet)}\n`);
    }
    
    // Help text
    if (warning.help) {
      output += chalk.gray(`   Help: ${warning.help}\n`);
    }
    
    return output;
  }
  
  /**
   * Format a single pass for console output
   * @param pass Pass object
   * @param index Pass number
   * @returns Formatted pass string
   */
  function formatPass(pass: Pass, index: number): string {
    let output = '';
    
    // Basic info
    output += chalk.green(`\n${index}. ${pass.description}\n`);
    
    // Element info
    if (pass.element) {
      const element = pass.element;
      output += chalk.gray(`   Element: ${element.tagName || 'unknown'}` + 
                        (element.id ? ` #${element.id}` : '') + 
                        (element.className ? ` .${element.className}` : '') + '\n');
    }
    
    return output;
  }
  
  /**
   * Format code snippet for console output
   * @param code Code snippet
   * @returns Formatted code snippet
   */
  function formatCodeSnippet(code: string): string {
    if (!code) return '';
    
    // Limit length
    if (code.length > 80) {
      code = code.substring(0, 77) + '...';
    }
    
    // Replace newlines and tabs
    code = code.replace(/\n/g, ' ').replace(/\t/g, ' ').replace(/\s+/g, ' ');
    
    return code;
  }
  
  /**
   * Get colored icon for impact level
   * @param impact Impact level
   * @returns Icon with color
   */
  function getImpactIcon(impact: string): string {
    switch (impact) {
      case 'critical':
        return chalk.red('●');
      case 'serious':
        return chalk.red('●');
      case 'moderate':
        return chalk.yellow('●');
      case 'minor':
        return chalk.blue('●');
      default:
        return chalk.gray('●');
    }
  }
  
  export default {
    format
  };