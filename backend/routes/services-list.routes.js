const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');

// GET /api/services-list — flat list of all x402 resources (endpoint + pricing)
router.get('/', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  const resources = await dataService.getResources();
  const servers = await dataService.getServers();

  const serverByUrl = {};
  for (const s of servers) serverByUrl[s.serverUrl] = s;

  const items = resources.slice(offset, offset + limit).map(r => {
    const s = serverByUrl[r.serverUrl] || {};
    return {
      serverUrl: r.serverUrl,
      serverTitle: s.title || '',
      endpoint: r.endpoint,
      slug: r.slug,
      method: r.method,
      description: r.description || '',
      pricing: r.pricing || [],
    };
  });

  res.json({
    items,
    pagination: { limit, offset, total: resources.length },
  });
});

module.exports = router;
