const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const { fetchPayAIResources } = require('../services/payai-catalog.service');
const { fetchAcedataResources } = require('../services/acedata-catalog.service');

// Convert PayAI xpay shape → orbitx402 resource shape
function payaiToResource(item) {
  let slug = '';
  let serverUrl = '';
  try {
    const u = new URL(item.resource);
    slug = u.pathname.replace(/^\//, '');
    serverUrl = u.origin;
  } catch { /* ignore malformed URLs */ }

  return {
    endpoint: item.resource,
    slug,
    serverUrl,
    method: item.method || 'GET',
    description: item.metadata?.description || item.metadata?.name || '',
    pricing: (item.accepts || []).map(a => ({
      network: a.network,
      asset: a.asset,
      amount: String(a.amount ?? '0'),
      amountUsdc: Number(a.amount ?? 0) / 1_000_000,
      payTo: a.payTo,
      scheme: a.scheme || 'exact',
    })),
    status: 'active',
    source: 'payai',
    updatedAt: item.lastUpdated || new Date().toISOString(),
    inputSchema: item.inputSchema,
    outputSchema: item.outputSchema,
  };
}

// GET /api/resources — list all discovered x402 endpoints
router.get('/', async (req, res) => {
  const { server, method, search, page = 1, limit = 100, source } = req.query;

  const [orbitResult, payaiResult, acedataResult] = await Promise.allSettled([
    dataService.getResources(),
    fetchPayAIResources(),
    fetchAcedataResources(),
  ]);

  if (payaiResult.status === 'rejected') {
    console.error('[resources] PayAI fetch failed:', payaiResult.reason?.message);
  }
  if (acedataResult.status === 'rejected') {
    console.error('[resources] AceData fetch failed:', acedataResult.reason?.message);
  }

  const orbitResources = orbitResult.status === 'fulfilled' ? (orbitResult.value || []) : [];
  const payaiRaw = payaiResult.status === 'fulfilled' ? (payaiResult.value || []) : [];
  const acedataRaw = acedataResult.status === 'fulfilled' ? (acedataResult.value || []) : [];

  // Merge — deduplicate by endpoint URL, orbitx402 wins.
  const seen = new Set();
  const merged = [];

  const wantOrbit = !source || source === 'orbitx402';
  const wantPayai = !source || source === 'payai';
  const wantAcedata = !source || source === 'acedata';

  if (wantOrbit) {
    for (const r of orbitResources) {
      if (!r.endpoint) continue;
      seen.add(r.endpoint);
      merged.push({ ...r, source: r.source || 'orbitx402' });
    }
  }

  if (wantPayai) {
    for (const item of payaiRaw) {
      if (!item.resource || seen.has(item.resource)) continue;
      if (!item.accepts?.length) continue;
      seen.add(item.resource);
      merged.push(payaiToResource(item));
    }
  }

  if (wantAcedata) {
    for (const r of acedataRaw) {
      if (!r.endpoint || seen.has(r.endpoint)) continue;
      seen.add(r.endpoint);
      merged.push(r);
    }
  }

  let resources = merged;

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
