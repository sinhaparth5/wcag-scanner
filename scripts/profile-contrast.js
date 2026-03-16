const { JSDOM } = require('jsdom');
const contrastRule = require('../dist/rules/contrast').default;

function buildLargeHtml({ sections = 300, paragraphsPerSection = 10 } = {}) {
  const parts = ['<!doctype html><html><body style="background:#fff;color:#111">'];

  for (let i = 0; i < sections; i += 1) {
    parts.push(`<section class="section-${i}">`);
    parts.push(`<h2 style="color:${i % 3 === 0 ? '#777' : '#222'}">Section ${i}</h2>`);

    for (let j = 0; j < paragraphsPerSection; j += 1) {
      const idx = i * paragraphsPerSection + j;
      const color = idx % 4 === 0 ? '#8a8a8a' : idx % 3 === 0 ? '#555' : '#1f2937';
      parts.push(`<p style="color:${color}">Paragraph ${idx} with repeated body copy for contrast testing.</p>`);
    }

    parts.push('</section>');
  }

  parts.push('</body></html>');
  return parts.join('');
}

async function main() {
  const html = buildLargeHtml();
  const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'https://example.org' });
  const start = performance.now();
  const results = await contrastRule.check(dom.window.document, dom.window, { level: 'AA' });
  const duration = Math.round(performance.now() - start);

  console.log('contrast.ts profile');
  console.log(`duration_ms=${duration}`);
  console.log(`violations=${results.violations.length}`);
  console.log(`warnings=${results.warnings.length}`);
  console.log(`passes=${results.passes.length}`);

  dom.window.close();
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
