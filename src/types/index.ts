/**
 * Scanner configuration options
 */
export interface ScannerOptions {
    /** WCAG level to check against (A, AA or AAA) */
    level?: 'A' | 'AA' | 'AAA';
    /** Specific rules to check */
    rules?: string[];
    /** Enable AI-powered suggestions */
    ai?: boolean;
    /** Base URL for relative paths */
    baseUrl?: string;
    /** Enable verbose output */
    verbose?: boolean;
    /** Ignore JavaScript errors in scanned pages */
    ignoreScriptErrors?: boolean;
}

/**
 * Element information for reporting
 */
export interface ElementInfo {
    /** HTML tag name */
    tagName?: string;
    /** Element ID */
    id?: string | null;
    /** Element class name(s) */
    className?: string | null;
    /** Element source (e.g., URL for images) */
    src?: string | null;
    /** Element text context */
    textContent?: string | null;
    /** Input type attribute */
    type?: string | null;
    /** Input name attribute */
    name?: string | null;
    /** shapes for the elements */
    shape?: string | null;
    /** Input coordinates */
    coords?: string | null;
    /** href for the elements */
    href?: string | null;
    /** Roles for ARIA label */
    role?: string | null;
    /** Attribute Names */
    attrName?: string;
    /** Attribute Values */
    attrValue?: string;
    /** Tabindex */
    tabindex?: string | null;
    /** Target */
    target?: string;
}

/**
 * Impact level of an accessibility issue
 */
export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor';

/**
 * Base result item (common for passes, violations, and warnings)
 */
export interface ResultItem {
    /** Rule identifier */
    rule: string;
    /** element information */
    element?: ElementInfo;
    /** Description of the issue or pass */
    description: string;
    /** HTML snippet */
    snippet?: string;
}

/**
 * Fix suggestion for accessibility issues
 */
export interface FixSuggestion {
    /** Corrected code snippet */
    code: string;
    /** Description of the fix */
    description: string;
    /** Explanation of the fix */
    explanation?: string;
}

/**
 * Accessibility violation result
 */
export interface Violation extends ResultItem {
    /** Impact level of the violation */
    impact: ImpactLevel;
    /** WCAG success criteria */
    wcag?: string[];
    /** Help text */
    help?: string;
    /** Help URL */
    helpUrl?: string;
    /** Fix suggestion (will be populated by AI module) */
    fix?: FixSuggestion;
}

/**
 * Accessibility warning result
 */
export interface Warning extends ResultItem {
    /** Impact level of the warning */
    impact: ImpactLevel;
    /** WCAG success criteria */
    wcag?: string[];
    /** Help text */
    help?: string;
}

/**
 * Accessibility pass result
 */
export interface Pass extends ResultItem {}

/**
 * Scanner Result
 */
export interface ScanResults {
    /** Passes */
    passes: Pass[];
    /** Violations */
    violations: Violation[];
    /** Warnings */
    warnings: Warning[];
}

/**
 * Rule interface
 */
export interface Rule {
    /** Run the rule check */
    check(document: Document, window: Window, options: ScannerOptions): Promise<ScanResults>;
}