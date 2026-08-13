const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { MongoClient } = require('mongodb');

const rootDir = __dirname;
const ADMIN_PASSWORD = 'makusha7';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/personal-portfolio';
const MONGODB_DB = process.env.MONGODB_DB || 'personal-portfolio';

let mongoClient = null;
let database = null;
let connectionPromise = null;
let memoryStore = [];
let useMongo = false;

async function connectToDatabase() {
  if (database) {
    return database;
  }

  if (!connectionPromise) {
    connectionPromise = MongoClient.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    })
      .then((client) => {
        mongoClient = client;
        database = client.db(MONGODB_DB);
        useMongo = true;
        return database;
      })
      .catch((error) => {
        console.warn('MongoDB not available, using in-memory fallback.', error.message);
        useMongo = false;
        return null;
      });
  }

  return connectionPromise;
}

async function getProjectsCollection() {
  const db = await connectToDatabase();
  if (!db) {
    return null;
  }

  return db.collection('projects');
}

async function readItems() {
  const collection = await getProjectsCollection();
  if (!collection) {
    return memoryStore.slice().reverse();
  }

  const items = await collection.find({}).sort({ createdAt: -1 }).toArray();
  return items.map(({ _id, ...item }) => item);
}

async function createItem(payload) {
  const collection = await getProjectsCollection();
  if (!collection) {
    const item = {
      id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: payload.title || 'Untitled item',
      description: payload.description || '',
      createdAt: new Date().toISOString()
    };

    memoryStore.push(item);
    return item;
  }

  const item = {
    id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: payload.title || 'Untitled item',
    description: payload.description || '',
    createdAt: new Date().toISOString()
  };

  await collection.insertOne(item);
  return item;
}

async function updateItem(id, payload) {
  const collection = await getProjectsCollection();
  if (!collection) {
    const index = memoryStore.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    memoryStore[index] = {
      ...memoryStore[index],
      title: payload.title || memoryStore[index].title,
      description: payload.description ?? memoryStore[index].description,
      updatedAt: new Date().toISOString()
    };

    return memoryStore[index];
  }

  const result = await collection.findOneAndUpdate(
    { id },
    {
      $set: {
        title: payload.title,
        description: payload.description,
        updatedAt: new Date().toISOString()
      }
    },
    { returnDocument: 'after' }
  );

  return result.value;
}

async function deleteItem(id) {
  const collection = await getProjectsCollection();
  if (!collection) {
    const initialLength = memoryStore.length;
    memoryStore = memoryStore.filter((item) => item.id !== id);
    return memoryStore.length < initialLength;
  }

  const result = await collection.deleteOne({ id });
  return result.deletedCount > 0;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function isAdminRequest(req) {
  return req.headers['x-admin-password'] === ADMIN_PASSWORD;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
  });
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

function serveStaticFile(res, requestPath) {
  const safePath = requestPath === '/' ? '/makbel.html' : requestPath;
  const relativePath = safePath.replace(/^\//, '');
  const filePath = path.join(rootDir, relativePath);

  if (!filePath.startsWith(rootDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const { pathname } = url;

    const handleRequest = async () => {
      if (pathname === '/api/admin/login') {
        if (req.method === 'POST') {
          const data = await readRequestBody(req);
          if (data.password === ADMIN_PASSWORD) {
            sendJson(res, 200, { success: true });
          } else {
            sendJson(res, 401, { error: 'Invalid admin password' });
          }
          return;
        }
      }

      if (pathname.startsWith('/api/items')) {
        const id = pathname.split('/').filter(Boolean).pop();

        if (req.method === 'GET' && pathname === '/api/items') {
          const items = await readItems();
          sendJson(res, 200, items);
          return;
        }

        if (req.method === 'POST' && pathname === '/api/items') {
          if (!isAdminRequest(req)) {
            sendJson(res, 401, { error: 'Admin access required' });
            return;
          }

          const data = await readRequestBody(req);
          const item = await createItem(data);
          sendJson(res, 201, item);
          return;
        }

        if (req.method === 'PUT' && pathname.startsWith('/api/items/')) {
          if (!isAdminRequest(req)) {
            sendJson(res, 401, { error: 'Admin access required' });
            return;
          }

          const data = await readRequestBody(req);
          const updatedItem = await updateItem(id, data);

          if (!updatedItem) {
            sendJson(res, 404, { error: 'Item not found' });
            return;
          }

          sendJson(res, 200, updatedItem);
          return;
        }

        if (req.method === 'DELETE' && pathname.startsWith('/api/items/')) {
          if (!isAdminRequest(req)) {
            sendJson(res, 401, { error: 'Admin access required' });
            return;
          }

          const deleted = await deleteItem(id);
          if (!deleted) {
            sendJson(res, 404, { error: 'Item not found' });
            return;
          }

          sendJson(res, 200, { success: true });
          return;
        }
      }

      serveStaticFile(res, pathname);
    };

    handleRequest().catch((error) => {
      console.error(error);
      if (!res.headersSent) {
        sendJson(res, 500, { error: 'Server error' });
      }
    });
  });
}

async function startServer(port = Number(process.env.PORT) || 3000) {
  await connectToDatabase();
  const server = createServer();

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Server running at http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createServer, startServer, connectToDatabase };
