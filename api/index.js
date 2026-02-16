// ========================================
// API Backend Helper (Optional)
// File: api/index.js
// ========================================

const { v4: uuidv4 } = require('uuid');

// Simple in-memory storage (untuk demo)
// Untuk production, gunakan database
const slugToUuidMap = new Map();
const uuidToSlugMap = new Map();

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const path = req.url;

  // POST /api/get-id - Convert slug to UUID
  if (req.method === 'POST' && path === '/api/get-id') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { slug, type } = JSON.parse(body);
        const key = `${type}:${slug}`;
        
        if (!slugToUuidMap.has(key)) {
          const uuid = uuidv4();
          slugToUuidMap.set(key, { uuid, slug, type });
          uuidToSlugMap.set(uuid, { slug, type });
        }
        
        const data = slugToUuidMap.get(key);
        res.status(200).json({ uuid: data.uuid });
      } catch (e) {
        res.status(400).json({ error: 'Invalid request' });
      }
    });
    return;
  }

  // GET /api/get-slug/:uuid - Convert UUID to slug
  if (req.method === 'GET' && path.startsWith('/api/get-slug/')) {
    const uuid = path.replace('/api/get-slug/', '');
    
    if (uuidToSlugMap.has(uuid)) {
      const data = uuidToSlugMap.get(uuid);
      res.status(200).json(data);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
    return;
  }

  res.status(404).json({ error: 'Endpoint not found' });
};
