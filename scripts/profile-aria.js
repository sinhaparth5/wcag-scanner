const { JSDOM } = require('jsdom');
const ariaRule = require('../dist/rules/aria').default;

function buildLargeHtml({ sections = 350, itemsPerSection = 8 } = {}) {
  const parts = ['<!doctype html><html><body>'];

  for (let i = 0; i < sections; i += 1) {
    parts.push(`<section aria-labelledby="heading-${i}">`);
    parts.push(`<h2 id="heading-${i}" role="heading">Section ${i}</h2>`);

    for (let j = 0; j < itemsPerSection; j += 1) {
      const idx = i * itemsPerSection + j;
      parts.push(
        `<div role="${j % 5 === 0 ? 'button' : 'group'}"` +
        ` aria-label="Item ${idx}"` +
        `${j % 4 === 0 ? ' aria-expanded="maybe"' : ''}` +
        `${j % 3 === 0 ? ' aria-controls="panel-' + idx + '"' : ''}` +
        `>` +
        `<span aria-hidden="${j % 2 === 0 ? 'true' : 'false'}">Label ${idx}</span>` +
        `</div>`
      );
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
  const results = await ariaRule.check(dom.window.document, dom.window, { level: 'AA' });
  const duration = Math.round(performance.now() - start);

  console.log('aria.ts profile');
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
