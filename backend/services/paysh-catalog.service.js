/**
 * pay.sh catalog fetcher.
 *
 * Fetches from pay.sh/api/catalog and returns providers as Resource entries.
 * pay.sh providers don't ship accepts[] — pricing comes from catalog metadata.
 * Excludes MPP-protocol providers (gateway-402.com hosts) since x402 can't settle them.
 */

const PAYSH_CATALOG_URL = process.env.PAYSH_CATALOG_URL || 'https://pay.sh/api/catalog';
const TTL_MS = 10 * 60 * 1000;

const USDC_DECIMALS = 6;
const USDC_MINTS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
]);

let _cache = { at: 0, data: null };

async function fetchPayshResources() {
  const now = Date.now();
  if (_cache.data && now - _cache.at < TTL_MS) return _cache.data;

  const res = await fetch(PAYSH_CATALOG_URL, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`pay.sh catalog HTTP ${res.status}`);

  const body = await res.json();
  const providers = Array.isArray(body.providers) ? body.providers : [];

  const resources = [];
  for (const p of providers) {
    if (!p.service_url) continue;

    let host = '';
    try { host = new URL(p.service_url).hostname; } catch { continue; }
    if (host.includes('gateway-402.com')) continue; // MPP protocol, skip

    resources.push({
      resource: p.service_url,
      type: 'http',
      method: 'POST',
      accepts: [],
      metadata: {
        source: 'paysh',
        fqn: p.fqn,
        title: p.title,
        description: p.description,
        use_case: p.use_case,
        category: p.category,
        min_price_usd: p.min_price_usd,
        max_price_usd: p.max_price_usd,
        has_free_tier: p.has_free_tier,
        docs_url: `https://pay.sh/services/${p.fqn}/index.md`,
      },
    });
  }

  _cache = { at: now, data: resources };
  return resources;
}

module.exports = { fetchPayshResources };
