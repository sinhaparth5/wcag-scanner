const { JSDOM } = require('jsdom');
const formsRule = require('../dist/rules/forms').default;

function buildLargeHtml({ forms = 250, fieldsPerForm = 6 } = {}) {
  const parts = ['<!doctype html><html><body>'];

  for (let i = 0; i < forms; i += 1) {
    parts.push(`<form id="form-${i}">`);

    for (let j = 0; j < fieldsPerForm; j += 1) {
      const idx = i * fieldsPerForm + j;
      parts.push(
        `<div class="field">` +
        `<input id="field-${idx}" type="text"${j % 2 === 0 ? ' required' : ''}${j % 3 === 0 ? ' pattern="[A-Za-z]+"' : ''}${j % 4 === 0 ? ' placeholder="Name"' : ''}>` +
        `</div>`
      );
    }

    parts.push('<fieldset><input type="checkbox"></fieldset>');
    parts.push('</form>');
  }

  parts.push('</body></html>');
  return parts.join('');
}

async function main() {
  const html = buildLargeHtml();
  const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'https://example.org' });
  const start = performance.now();
  const results = await formsRule.check(dom.window.document, dom.window, { level: 'AA' });
  const duration = Math.round(performance.now() - start);

  console.log('forms.ts profile');
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
