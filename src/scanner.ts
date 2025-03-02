import { JSDOM } from "jsdom";
import { ScannerOptions, ScanResults, Rule } from "./types";
import fs from "fs";
import path from "path";

/**
 * Main WCAG Scanner class
 */
export class WCAGScanner {
    private options: ScannerOptions;
    private dom?: JSDOM;
    private document?: Document;
    private window?: Window;
    private results: ScanResults;
    private rules: Map<string, Rule> = new Map();

    /**
     * Create a new WCAG Scanner options
     * @param options Scanner options
     */
    constructor(options: ScannerOptions = {}) {
        this.options = {
            rules: ['images', 'headings', 'contrast', 'forms', 'aria'],
            level: 'AA',
            ai: true,
            ...options
        };

        this.results = {
            passes: [],
            violations: [],
            warnings: []
        };
    }

    /**
     * Load HTML content for scanning
     * @param html HTML content to scan
     * @param baseUrl Base URL for relative paths
     * @param Promise<boolean> True if loaded sucessfully
     */
    async loadHTML(html: string, baseUrl = 'https://example.org'): Promise<boolean> {
        try {
            this.dom = new JSDOM(html, {
                url: baseUrl,
                resources: 'usable',
                runScripts: 'dangerously',
                beforeParse(window) {
                    window.addEventListener('error', (event) => {
                        console.log(`Ignored script error: ${event.message}`);
                        event.preventDefault();
                    });

                    // Mock modern browser APIs if needed
                    if (!window.ReadableStream) {
                        window.ReadableStream = class MockReadableStream {
                            constructor() {}
                            getReader() { return { read: () => {} }; }
                        } as any;
                    }
                }
            });
            this.document = this.dom.window.document;
            this.window = this.dom.window as unknown as Window;

            await new Promise(resolve => setTimeout(resolve, 100));
            return true;
        } catch (error) {
            console.error('Error loading HTML:', error);
            if (this.dom) {
                this.document = this.dom.window.document;
                this.window = this.dom.window as unknown as Window;
                return true;
            }
            return false;
        }
    }

    /**
     * Register a rule module
     * @param name Rule name
     * @param rule Rule implementation
     */
    registerRule(name: string, rule: Rule): void {
        this.rules.set(name, rule);
    }

    /**
     * Load built-in rules
     */
    async loadRules(): Promise<void> {
        // Skip this process if running from the declaration files
        if (__filename.endsWith(".d.ts")) return;
        
        try {
            const rulesDir = path.join(__dirname, 'rules');

            // Skip in a test environment
            if (!fs.existsSync(rulesDir)) return;

            const ruleFiles = fs.readdirSync(rulesDir)
                .filter(file => file.endsWith('.js') || file.endsWith('.d.ts'));
            
            for (const file of ruleFiles) {
                try {
                    const ruleName = path.basename(file, '.js');
                    const rulePath = path.join(rulesDir, file);

                    // Import the rule module properly
                    const ruleModule = require(rulePath);
                    const rule = ruleModule.default || ruleModule;

                    if (rule && typeof rule.check === 'function') {
                        this.registerRule(ruleName, rule);
                    }
                } catch (error) {
                    console.error(`Error loading rule from ${file}:`, error);
                }
            }
        } catch (error) {
            console.error('Error loading rules:', error);
        }
    }

    /**
     * Run the accessibility scan
     * @returns Promise<ScanResults> Scan results
     */
    async scan(): Promise<ScanResults> {
        if (!this.document || !this.window) {
            throw new Error('HTML not loaded. Call loadHTML() first.');
        }

        this.results = {
            passes: [],
            violations: [],
            warnings: []
        };

        // Load rules if not already loaded.
        if (this.rules.size === 0) {
            await this.loadRules();
        }

        // Run each enabled rule
        const enabledRules = this.options.rules || [];
        for (const ruleName of enabledRules) {
            const rule = this.rules.get(ruleName);
            if (rule) {
                try {
                    const ruleResults = await rule.check(this.document, this.window, this.options);

                    // Merge results
                    this.results.passes.push(...ruleResults.passes);
                    this.results.violations.push(...ruleResults.violations);
                    this.results.warnings.push(...ruleResults.warnings);
                } catch (error) {
                    console.error(`Error running rule ${ruleName}:`, error);
                }
            }
        }

        return this.results;
    }

    /**
     * Get the scan results
     * @return ScanResults Current scan results
     */
    getResults(): ScanResults {
        return this.results;
    }
}