const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');

router.get('/', async (req, res) => {
  const { facilitator, direction, page = 1, limit = 50, since, until } = req.query;

  let transfers = await dataService.getTransfers();

  if (facilitator) transfers = transfers.filter(t => t.facilitatorId === facilitator);
  if (direction) transfers = transfers.filter(t => t.direction === direction);
  if (since) { const d = new Date(since); transfers = transfers.filter(t => new Date(t.blockTimestamp) >= d); }
  if (until) { const d = new Date(until); transfers = transfers.filter(t => new Date(t.blockTimestamp) <= d); }

  const total = transfers.length;
  const pageNum = parseInt(page);
  const pageSize = Math.min(parseInt(limit), 200);
  const offset = (pageNum - 1) * pageSize;

  res.json({
    transfers: transfers.slice(offset, offset + pageSize),
    pagination: { page: pageNum, limit: pageSize, total, pages: Math.ceil(total / pageSize) },
  });
});

module.exports = router;
