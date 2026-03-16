const { JSDOM } = require('jsdom');
const imagesRule = require('../dist/rules/images').default;

function buildLargeHtml({ sections = 250, imagesPerSection = 6 } = {}) {
  const parts = ['<!doctype html><html><body>'];

  for (let i = 0; i < sections; i += 1) {
    parts.push(`<section class="hero hero-${i}" style="background-image:url('hero-${i}.png')">`);
    parts.push(`<h2>Section ${i}</h2>`);

    for (let j = 0; j < imagesPerSection; j += 1) {
      const idx = i * imagesPerSection + j;
      parts.push(
        `<div class="card card-${idx}">` +
        `<img src="img-${idx}.jpg"${j % 2 === 0 ? '' : ` alt="Image ${idx}"`} />` +
        `<svg${j % 3 === 0 ? '' : ' role="img" aria-label="chart"'}><rect width="10" height="10"></rect></svg>` +
        `<div class="content" style="${j % 4 === 0 ? `background-image:url('bg-${idx}.jpg')` : ''}">Card ${idx}</div>` +
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
  const results = await imagesRule.check(dom.window.document, dom.window, { level: 'AA' });
  const duration = Math.round(performance.now() - start);

  console.log('images.ts profile');
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
