const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');

router.get('/', async (req, res) => {
  const facilitators = await dataService.getFacilitators();
  res.json({ facilitators });
});

router.get('/:id', async (req, res) => {
  const facilitators = await dataService.getFacilitators();
  const facilitator = facilitators.find(f => f.id === req.params.id);
  if (!facilitator) return res.status(404).json({ error: 'Facilitator not found' });

  const transfers = (await dataService.getTransfers())
    .filter(t => t.facilitatorId === req.params.id)
    .slice(0, 100);

  res.json({ facilitator, recentTransfers: transfers });
});

module.exports = router;
