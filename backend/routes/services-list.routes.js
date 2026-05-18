const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');

router.get('/', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  const servers = await dataService.getServers();
  const resources = await dataService.getResources();

  const resourceCountByServer = {};
  for (const r of resources) {
    const k = r.serverUrl || '';
    resourceCountByServer[k] = (resourceCountByServer[k] || 0) + 1;
  }

  const sorted = servers.slice().sort(
    (a, b) => (b.stats?.transactionCount || 0) - (a.stats?.transactionCount || 0)
  );

  const items = sorted.slice(offset, offset + limit).map(s => ({
    serverUrl: s.serverUrl,
    title: s.title || '',
    description: s.description || '',
    favicon: s.favicon || null,
    chains: s.chains || [],
    facilitators: s.facilitators || [],
    stats: s.stats || { transactionCount: 0, totalVolume: 0, uniqueBuyers: 0 },
    resourceCount: resourceCountByServer[s.serverUrl] || 0,
  }));

  res.json({
    items,
    pagination: { limit, offset, total: servers.length },
  });
});

module.exports = router;
