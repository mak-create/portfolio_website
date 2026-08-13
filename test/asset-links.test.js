const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('HTML links to the actual stylesheet and script files', () => {
  const htmlPath = path.join(__dirname, '..', 'makbel.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /<link rel="stylesheet"\s+href="makbel\.css">/);
  assert.match(html, /<script src="makbel\.js"><\/script>/);
});
