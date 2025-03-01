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
    fix?: {
        code?: string;
        description: string;
        explanation?: string;
    };
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
export interface ScanResult {
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
    check(document: Document, window: Window, options: ScannerOptions): Promise<ResultItem>;
}