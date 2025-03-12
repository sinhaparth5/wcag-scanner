import * as wasmModule from "../../scrapper/pkg";
/**
 * WASM based URL scraper using Rust
 */
export class WsamScraper {
    private wasmModule!: typeof wasmModule;
    private initialized: boolean = false;

    /**
     * Initialize the WASM scraper
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            this.wasmModule = await import("../../scrapper/pkg");
            this.wasmModule.init_panic_hook();
            this.initialized = true;
            console.log("WASM scraper initialized successfully");
        } catch (error) {
            console.error("Failed to initialize WASM scraper:", error);
            throw error;
        }
    }

    /**
     * Scrape a URL using Rust/WASM
     * @param url URL to scrape
     * @returns Promise<string> HTML content
     */
    async scrapeUrl(url: string): Promise<string> {
        if (!this.initialized) {
            await this.initialize();
        }

        console.log(`Scraping URL using Rust/WASM: ${url}`);

        try {
            const uint8Array = await this.wasmModule.scrape_url(url) as Uint8Array;

            const decoder = new TextDecoder('utf-8');
            const html = decoder.decode(uint8Array);
            console.log(`Successfully scraped ${html.length} bytes of HTML content`);
            return html;
        } catch (error) {
            console.error("Error in WASM scraper:", error);
            throw error;
        }
    }
}

export default new WsamScraper;