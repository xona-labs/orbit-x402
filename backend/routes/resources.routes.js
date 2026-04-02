const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');

// GET /api/resources — list all discovered x402 endpoints
router.get('/', (req, res) => {
  const { server, method, search, page = 1, limit = 100 } = req.query;

  let resources = dataService.getResources();

  if (server) {
    resources = resources.filter(r => r.serverUrl === server);
  }

  if (method) {
    resources = resources.filter(r => r.method?.toUpperCase() === method.toUpperCase());
  }

  if (search) {
    const term = search.toLowerCase();
    resources = resources.filter(r =>
      (r.slug || '').toLowerCase().includes(term) ||
      (r.endpoint || '').toLowerCase().includes(term) ||
      (r.description || '').toLowerCase().includes(term) ||
      (r.serverUrl || '').toLowerCase().includes(term)
    );
  }

  const total = resources.length;
  const pageNum = parseInt(page);
  const pageSize = Math.min(parseInt(limit), 200);
  const offset = (pageNum - 1) * pageSize;
  const paginated = resources.slice(offset, offset + pageSize);

  res.json({
    resources: paginated,
    total,
    pagination: { page: pageNum, limit: pageSize, total, pages: Math.ceil(total / pageSize) },
  });
});

module.exports = router;
