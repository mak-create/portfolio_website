const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('../server');

test('certificate page assets are available and served correctly', async () => {
  const server = createServer();

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const pdfPath = path.join(__dirname, '..', 'certificates', 'ai-fundamental-certificate.pdf');
    assert.ok(fs.existsSync(pdfPath), 'Certificate PDF should be present in the project');

    const response = await fetch(`http://127.0.0.1:${port}/certificates/ai-fundamental-certificate.pdf`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /application\/pdf/i);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
