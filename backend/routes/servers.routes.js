const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const discoveryService = require('../services/discovery.service');

router.get('/', async (req, res) => {
  const { chain, facilitator, search, page = 1, limit = 50 } = req.query;

  let servers = await dataService.getServers();

  if (chain) {
    const c = chain.toLowerCase();
    servers = servers.filter(s => s.chains?.some(ch => ch.toLowerCase().includes(c)));
  }
  if (facilitator) servers = servers.filter(s => s.facilitators?.includes(facilitator));
  if (search) {
    const term = search.toLowerCase();
    servers = servers.filter(s =>
      (s.title || '').toLowerCase().includes(term) ||
      (s.description || '').toLowerCase().includes(term) ||
      (s.serverUrl || '').toLowerCase().includes(term)
    );
  }

  servers.sort((a, b) => (b.stats?.transactionCount || 0) - (a.stats?.transactionCount || 0));

  const total = servers.length;
  const pageNum = parseInt(page);
  const pageSize = Math.min(parseInt(limit), 100);
  const offset = (pageNum - 1) * pageSize;

  const allServers = await dataService.getServers();
  const allChains = [...new Set(allServers.flatMap(s => s.chains || []))].sort();
  const allFacilitators = [...new Set(allServers.flatMap(s => s.facilitators || []))].sort();

  res.json({
    servers: servers.slice(offset, offset + pageSize),
    total,
    pagination: { page: pageNum, limit: pageSize, total, pages: Math.ceil(total / pageSize) },
    filters: { chains: allChains, facilitators: allFacilitators },
  });
});

router.get('/detail', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url param required' });

  const servers = await dataService.getServers();
  const server = servers.find(s => s.serverUrl === url);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const resources = (await dataService.getResources()).filter(r => r.serverUrl === url);
  res.json({ server, resources });
});

// POST /api/servers/register — external servers self-register
const _registerLimiter = new Map(); // IP -> [timestamps]
router.post('/register', async (req, res) => {
  const { url, title, description } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  if (!url.startsWith('https://')) {
    return res.status(400).json({ error: 'url must be https' });
  }

  // Simple rate limit: 5 per hour per IP
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const hourAgo = now - 3600000;
  const history = (_registerLimiter.get(ip) || []).filter(t => t > hourAgo);
  if (history.length >= 5) {
    return res.status(429).json({ error: 'Rate limit: max 5 registrations per hour' });
  }
  history.push(now);
  _registerLimiter.set(ip, history);

  try {
    // Check duplicate
    const existing = await dataService.getServers();
    if (existing.find(s => s.serverUrl === url)) {
      return res.status(409).json({ error: 'Server already registered' });
    }

    // Probe for x402 resources
    const resources = await discoveryService.probeServerResources(url);

    // Save server
    const server = {
      serverUrl: url,
      title: title || '',
      description: description || '',
      chains: [],
      facilitators: [],
      recipients: [],
      stats: { transactionCount: 0, totalVolume: 0, uniqueBuyers: 0 },
      source: 'registered',
      resourceCount: resources.length,
      lastProbedAt: new Date().toISOString(),
    };
    await dataService.addOrUpdateServer(server);

    // Save discovered resources
    if (resources.length > 0) {
      await dataService.bulkAddResources(resources);
    }

    res.json({
      success: true,
      server: { serverUrl: url, title: server.title, resourceCount: resources.length },
      message: resources.length > 0
        ? `Registered with ${resources.length} x402 endpoints discovered`
        : 'Registered. No x402 discovery document found — add /.well-known/x402 to your server.',
    });
  } catch (err) {
    console.error('[Register] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const servers = await discoveryService.syncServers(req.body || {});
    for (const server of servers) await dataService.addOrUpdateServer(server);
    res.json({ success: true, synced: servers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/probe', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });

  console.log(`[Probe] Starting probe for: ${url}`);

  try {
    const resources = await discoveryService.probeServerResources(url);
    console.log(`[Probe] ${url} → ${resources.length} endpoints found`);

    for (const r of resources) {
      await dataService.addOrUpdateResource(r);
    }
    console.log(`[Probe] Saved ${resources.length} resources to data store`);

    const servers = dataService.read('servers')?.servers || [];
    const server = servers.find(s => s.serverUrl === url);
    if (server) {
      server.resourceCount = resources.length;
      server.lastProbedAt = new Date().toISOString();
      await dataService.addOrUpdateServer(server);
      console.log(`[Probe] Updated server record for ${url}`);
    } else {
      console.log(`[Probe] Warning: server not found in servers.json for ${url}`);
    }

    res.json({ success: true, resources: resources.length, endpoints: resources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/probe-all', async (req, res) => {
  try {
    const results = await discoveryService.runFullDiscovery({
      ...req.body, probeEndpoints: true, probePricing: req.body?.probePricing || false,
    });
    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
