const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server');

test('CRUD endpoints create, update, and delete items', async () => {
  const server = createServer();

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const loginResponse = await fetch(`http://127.0.0.1:${port}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'makusha7' })
    });

    assert.equal(loginResponse.status, 200);

    const createResponse = await fetch(`http://127.0.0.1:${port}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': 'makusha7' },
      body: JSON.stringify({ title: 'Test item', description: 'Temporary record' })
    });

    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.title, 'Test item');

    const updateResponse = await fetch(`http://127.0.0.1:${port}/api/items/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': 'makusha7' },
      body: JSON.stringify({ title: 'Updated item', description: 'Updated record' })
    });

    assert.equal(updateResponse.status, 200);
    const updated = await updateResponse.json();
    assert.equal(updated.title, 'Updated item');

    const deleteResponse = await fetch(`http://127.0.0.1:${port}/api/items/${created.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': 'makusha7' }
    });

    assert.equal(deleteResponse.status, 200);

    const listResponse = await fetch(`http://127.0.0.1:${port}/api/items`);
    const list = await listResponse.json();
    assert.ok(!list.some((item) => item.id === created.id));
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
