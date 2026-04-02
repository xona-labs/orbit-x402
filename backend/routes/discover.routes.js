const express = require('express');
const router = express.Router();
const llmDiscovery = require('../services/llm-discovery.service');

// POST /api/discover — LLM-powered natural language discovery
router.post('/', async (req, res) => {
  const { query } = req.body || {};

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query is required' });
  }

  if (query.length > 500) {
    return res.status(400).json({ error: 'query too long (max 500 chars)' });
  }

  try {
    const results = await llmDiscovery.discover(query.trim());
    res.json(results);
  } catch (err) {
    console.error('[Discover] Error:', err.message);
    res.status(500).json({ error: 'Discovery failed' });
  }
});

module.exports = router;
