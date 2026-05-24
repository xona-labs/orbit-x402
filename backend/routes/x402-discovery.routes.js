/**
 * GET /api/x402-discovery
 *
 * xpay-compatible discovery endpoint. Combines:
 *   1. orbitx402's own probed resources (endpoint → resource, pricing → accepts)
 *   2. PayAI catalog (facilitator.payai.network)
 *   3. pay.sh catalog (pay.sh/api/catalog)
 *
 * Response shape matches PayAI's pagination format so xpay can use the same
 * fetcher pattern: { items: Resource[], pagination: { limit, offset, total } }
 *
 * Optional query params:
 *   ?query=   keyword filter (matched against resource URL + metadata)
 *   ?source=  orbitx402|payai|paysh  (default: all)
 *   ?limit=   max items (default 500, max 2000)
 *   ?offset=  pagination offset (default 0)
 */

const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const { fetchPayAIResources } = require('../services/payai-catalog.service');
const { fetchPayshResources } = require('../services/paysh-catalog.service');

function orbitResourceToXpay(r) {
  return {
    resource: r.endpoint,
    type: 'http',
    method: r.method || 'GET',
    accepts: (r.pricing || []).map(p => ({
      asset: p.asset,
      payTo: p.payTo,
      amount: String(p.amount),
      scheme: p.scheme || 'exact',
      network: p.network,
    })),
    lastUpdated: r.updatedAt,
    metadata: {
      source: 'orbitx402',
      serverUrl: r.serverUrl,
      description: r.description,
      slug: r.slug,
    },
    inputSchema: r.inputSchema,
  };
}

router.get('/', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 500, 1), 2000);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const query = String(req.query.query || '').trim().toLowerCase();
  const sourceFilter = req.query.source ? String(req.query.source).split(',') : null;

  const wantSource = (s) => !sourceFilter || sourceFilter.includes(s);

  const [orbitRaw, payaiItems, payshItems] = await Promise.allSettled([
    wantSource('orbitx402') ? dataService.getResources() : Promise.resolve([]),
    wantSource('payai') ? fetchPayAIResources() : Promise.resolve([]),
    wantSource('paysh') ? fetchPayshResources() : Promise.resolve([]),
  ]);

  const orbit = orbitRaw.status === 'fulfilled' ? orbitRaw.value : [];
  const payai = payaiItems.status === 'fulfilled' ? payaiItems.value : [];
  const paysh = payshItems.status === 'fulfilled' ? payshItems.value : [];

  if (payaiItems.status === 'rejected') console.error('[x402-discovery] PayAI fetch failed:', payaiItems.reason?.message);
  if (payshItems.status === 'rejected') console.error('[x402-discovery] pay.sh fetch failed:', payshItems.reason?.message);

  // Combine — deduplicate by resource URL, orbitx402 wins over payai/paysh.
  const seen = new Set();
  const all = [];

  for (const r of orbit) {
    if (!r.endpoint) continue;
    const mapped = orbitResourceToXpay(r);
    if (!mapped.accepts.length) continue; // skip unprobed
    seen.add(r.endpoint);
    all.push(mapped);
  }
  for (const r of payai) {
    if (!r.resource || seen.has(r.resource)) continue;
    if (!r.accepts?.length) continue; // skip unprobed
    seen.add(r.resource);
    all.push(r);
  }
  for (const r of paysh) {
    if (!r.resource || seen.has(r.resource)) continue;
    if (!r.accepts?.length) continue; // skip until probed by sync job
    seen.add(r.resource);
    all.push(r);
  }

  // Keyword filter.
  let filtered = all;
  if (query) {
    const terms = query.split(/\s+/).filter(Boolean);
    filtered = all.filter(r => {
      const hay = [
        r.resource,
        JSON.stringify(r.metadata || {}),
        JSON.stringify(r.inputSchema || {}),
      ].join(' ').toLowerCase();
      return terms.every(t => hay.includes(t));
    });
  }

  const page = filtered.slice(offset, offset + limit);

  res.json({
    items: page,
    pagination: { limit, offset, total: filtered.length },
  });
});

module.exports = router;
