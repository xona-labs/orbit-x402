/**
 * PayAI catalog fetcher.
 *
 * Fetches from facilitator.payai.network/discovery/resources and returns
 * resources already in xpay's Resource shape (accepts[], resource, type, method).
 */

const PAYAI_ENDPOINT = process.env.PAYAI_ENDPOINT || 'https://facilitator.payai.network/discovery/resources';
const PAGE_SIZE = 1000;
const TTL_MS = 10 * 60 * 1000;

let _cache = { at: 0, data: null };

async function fetchPayAIResources() {
  const now = Date.now();
  if (_cache.data && now - _cache.at < TTL_MS) return _cache.data;

  const all = [];
  let offset = 0;
  let total = Infinity;

  for (let page = 0; page < 100 && offset < total; page++) {
    const url = new URL(PAYAI_ENDPOINT);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(offset));

    const res = await fetch(url.toString(), {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`PayAI catalog HTTP ${res.status}`);

    const body = await res.json();
    const items = Array.isArray(body.items) ? body.items : [];

    for (const item of items) {
      if (!item.resource || !Array.isArray(item.accepts)) continue;
      all.push({
        resource: item.resource,
        type: item.type || 'http',
        method: item.method || 'GET',
        accepts: item.accepts,
        lastUpdated: item.lastUpdated,
        metadata: { ...item.metadata, source: 'payai' },
        inputSchema: item.inputSchema,
        outputSchema: item.outputSchema,
      });
    }

    if (body.pagination) {
      total = body.pagination.total;
      offset = body.pagination.offset + items.length;
    } else {
      break;
    }
    if (items.length < PAGE_SIZE) break;
  }

  _cache = { at: now, data: all };
  return all;
}

module.exports = { fetchPayAIResources };
