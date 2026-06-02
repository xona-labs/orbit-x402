/**
 * AceData catalog fetcher.
 *
 * Fetches https://platform.acedata.cloud/.well-known/x402 to get the
 * resource list, then probes each endpoint for live 402 pricing.
 * Results are cached for 30 min since probing ~70 endpoints takes time.
 */

const discoveryService = require('./discovery.service');

const WELL_KNOWN_URL = process.env.ACEDATA_WELL_KNOWN_URL || 'https://platform.acedata.cloud/.well-known/x402';
const TTL_MS = 30 * 60 * 1000;
const CONCURRENCY = 5;

let _cache = { at: 0, data: null };

async function fetchAcedataResources() {
  const now = Date.now();
  if (_cache.data && now - _cache.at < TTL_MS) return _cache.data;

  // Fetch the well-known discovery doc
  const resp = await fetch(WELL_KNOWN_URL, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`AceData well-known HTTP ${resp.status}`);

  const body = await resp.json();
  const rawUrls = Array.isArray(body.resources) ? body.resources : [];

  if (rawUrls.length === 0) {
    _cache = { at: now, data: [] };
    return [];
  }

  console.log(`[AceData] Probing ${rawUrls.length} endpoints for 402 pricing...`);

  // Probe in parallel with a concurrency cap
  const results = [];
  for (let i = 0; i < rawUrls.length; i += CONCURRENCY) {
    const batch = rawUrls.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(url => probeAndBuild(url))
    );
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) results.push(s.value);
    }
  }

  console.log(`[AceData] Probed ${rawUrls.length} endpoints → ${results.length} with pricing`);

  _cache = { at: now, data: results };
  return results;
}

async function probeAndBuild(endpoint) {
  let slug = '';
  let serverUrl = '';
  try {
    const u = new URL(endpoint);
    slug = u.pathname.replace(/^\//, '');
    serverUrl = u.origin;
  } catch {
    return null;
  }

  const pricing = await discoveryService.probeEndpointPricing(endpoint, 'POST');
  if (!pricing || pricing.accepts.length === 0) return null;

  return {
    endpoint,
    slug,
    serverUrl,
    method: 'POST',
    description: pricing.description || pricing.resource?.description || slug.replace(/\//g, ' › '),
    pricing: pricing.accepts,
    inputSchema: pricing.inputSchema || null,
    status: 'active',
    source: 'acedata',
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { fetchAcedataResources };
