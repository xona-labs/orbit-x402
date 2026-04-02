const axios = require('axios');
const dataService = require('./data.service');

const X402SCAN_TRPC_URL = 'https://x402scan.com/api/trpc/public.sellers.bazaar.list';
const PAGE_SIZE = 10;

const DISCOVERY_PATHS = [
  '/.well-known/x402',
  '/.well-known/x402-resources',
  '/x402-resources',
];

class DiscoveryService {

  // ================================================================
  //  PHASE 1: Sync SERVERS from x402scan
  // ================================================================

  async syncServers(opts = {}) {
    const { solanaOnly = false } = opts;
    const allServers = [];
    let page = 1;
    let hasMore = true;
    let consecutiveEmpty = 0;

    console.log(`[Discovery] Syncing servers from x402scan.com...`);

    while (hasMore) {
      try {
        const input = JSON.stringify({
          json: { timeframe: 1, pagination: { pageSize: PAGE_SIZE, page } },
        });

        const resp = await axios.get(X402SCAN_TRPC_URL, {
          params: { input },
          timeout: 30000,
        });

        const data = resp.data?.result?.data?.json;
        if (!data || !data.items) break;

        const parsed = data.items.map(item => this._parseX402ScanServer(item)).filter(Boolean);

        const filtered = solanaOnly
          ? parsed.filter(s => s.chains.some(c => c.toLowerCase() === 'solana'))
          : parsed;

        allServers.push(...filtered);
        console.log(`[Discovery] x402scan page ${page}/${data.total_pages}: ${filtered.length} servers (${allServers.length} total)`);

        if (filtered.length === 0) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 5) break;
        } else {
          consecutiveEmpty = 0;
        }

        hasMore = data.hasNextPage && page < data.total_pages;
        page++;
        if (hasMore) await this._sleep(300);
      } catch (err) {
        console.error(`[Discovery] x402scan page ${page} error:`, err.message);
        break;
      }
    }

    console.log(`[Discovery] Server sync complete: ${allServers.length} servers`);
    return allServers;
  }

  _parseX402ScanServer(item) {
    if (!item) return null;
    const rawOrigins = item.origins || [];
    const first = rawOrigins[0] || {};
    const serverUrl = first.origin || '';
    if (!serverUrl) return null;

    const totalAmountRaw = item.total_amount || 0;

    return {
      serverUrl,
      title: first.title || '',
      description: first.description || '',
      favicon: first.favicon || '',
      chains: item.chains || [],
      facilitators: item.facilitators || [],
      recipients: item.recipients || [],
      origins: rawOrigins.map(o => o.origin || o).filter(Boolean),
      stats: {
        transactionCount: item.tx_count || 0,
        totalVolume: parseFloat((totalAmountRaw / 1e6).toFixed(2)),
        uniqueBuyers: item.unique_buyers || 0,
      },
      lastActivityAt: item.latest_block_timestamp || null,
      source: 'x402scan',
      resourceCount: 0,
      lastProbedAt: null,
    };
  }

  // ================================================================
  //  PHASE 2: Probe RESOURCES (endpoints) from each server
  // ================================================================

  async probeServerResources(serverUrl, opts = {}) {
    const { withPricing = true } = opts;
    const resources = [];

    for (const discoveryPath of DISCOVERY_PATHS) {
      try {
        const url = `${serverUrl.replace(/\/$/, '')}${discoveryPath}`;
        const resp = await axios.get(url, { timeout: 10000, validateStatus: s => s < 500 });

        if (resp.status === 200 && resp.data) {
          const parsed = this._parseDiscoveryDoc(resp.data, serverUrl);
          if (parsed.length > 0) {
            resources.push(...parsed);
            break;
          }
        }
      } catch (err) {
        // Try next path
      }
    }

    // Probe each endpoint for 402 pricing + description
    if (withPricing && resources.length > 0) {
      console.log(`[Discovery] Probing ${resources.length} endpoints on ${serverUrl} for pricing...`);

      for (const ep of resources) {
        try {
          const pricing = await this.probeEndpointPricing(ep.endpoint, ep.method);
          if (pricing) {
            ep.pricing = pricing.accepts;
            ep.description = ep.description || pricing.description || '';
            ep.inputSchema = ep.inputSchema || pricing.inputSchema || null;
          }
        } catch (err) {
          // Skip failing endpoint
        }
        await this._sleep(150);
      }
    }

    return resources;
  }

  _parseDiscoveryDoc(data, serverUrl) {
    const resources = [];

    if (typeof data === 'string') return resources;

    // x402 discovery doc: { version, description, resources: [...], instructions }
    const items = data.resources || data.endpoints || (Array.isArray(data) ? data : []);

    for (const item of items) {
      if (typeof item === 'string') {
        // Simple string format: "POST /api/v1/agent/expert" or "https://..."
        const parsed = this._parseStringResource(item, serverUrl);
        if (parsed) resources.push(parsed);
      } else if (typeof item === 'object' && item !== null) {
        // Object format with url, method, description, accepts etc.
        const parsed = this._parseObjectResource(item, serverUrl);
        if (parsed) resources.push(parsed);
      }
    }

    return resources;
  }

  _parseStringResource(str, serverUrl) {
    // Formats: "POST /api/v1/endpoint" or "https://server.com/api/endpoint"
    let method = 'POST';
    let path = str;

    const methodMatch = str.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/i);
    if (methodMatch) {
      method = methodMatch[1].toUpperCase();
      path = methodMatch[2];
    }

    // If it's a full URL, use it directly
    let endpoint;
    if (path.startsWith('http')) {
      endpoint = path;
    } else {
      endpoint = `${serverUrl.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
    }

    const slug = this._extractSlug(endpoint);

    return {
      endpoint,
      slug,
      serverUrl,
      method,
      description: '',
      pricing: [],
      status: 'active',
    };
  }

  _parseObjectResource(item, serverUrl) {
    const endpoint = item.url || item.endpoint || (item.path ? `${serverUrl.replace(/\/$/, '')}${item.path}` : '');
    if (!endpoint) return null;

    return {
      endpoint,
      slug: item.slug || this._extractSlug(endpoint),
      serverUrl,
      method: (item.method || 'POST').toUpperCase(),
      description: item.description || item.name || '',
      pricing: this._extractPricing(item),
      inputSchema: item.inputSchema || item.input_schema || null,
      outputSchema: item.outputSchema || item.output_schema || null,
      status: 'active',
    };
  }

  /**
   * Probe a specific endpoint to get 402 response with pricing details.
   */
  async probeEndpointPricing(endpoint, method = 'POST') {
    try {
      const config = { timeout: 10000, validateStatus: s => true };
      const resp = method === 'GET'
        ? await axios.get(endpoint, config)
        : await axios.post(endpoint, {}, config);

      if (resp.status === 402) {
        const pricing = this._parse402Response(resp);
        return pricing;
      }
    } catch (err) {
      // Endpoint unavailable
    }
    return null;
  }

  _parse402Response(resp) {
    const result = { accepts: [], description: '', resource: null };

    // Try Payment-Required header (base64 JSON)
    const prHeader = resp.headers['payment-required'];
    if (prHeader) {
      try {
        const decoded = JSON.parse(Buffer.from(prHeader, 'base64').toString('utf-8'));
        result.accepts = (decoded.accepts || []).map(a => ({
          network: a.network || '',
          asset: a.asset || '',
          amount: a.amount || '0',
          amountUsdc: parseInt(a.amount || '0') / 1e6,
          payTo: a.payTo || '',
          scheme: a.scheme || 'exact',
        }));
        result.description = decoded.resource?.description || '';
        result.resource = decoded.resource || null;

        // Extract schema from bazaar extensions
        if (decoded.extensions?.bazaar?.info) {
          result.inputSchema = decoded.extensions.bazaar.info;
        }
        if (decoded.extensions?.bazaar?.schema) {
          result.schema = decoded.extensions.bazaar.schema;
        }
      } catch (err) {
        // Not valid base64 JSON
      }
    }

    // Fallback: try body
    if (result.accepts.length === 0 && resp.data?.accepts) {
      result.accepts = (resp.data.accepts || []).map(a => ({
        network: a.network || '',
        asset: a.asset || '',
        amount: a.maxAmountRequired || a.amount || '0',
        payTo: a.payTo || '',
      }));
    }

    return result;
  }

  // ================================================================
  //  MAIN RUNNERS
  // ================================================================

  /**
   * Full sync: servers from x402scan → probe each for endpoints → extract pricing
   */
  async runFullDiscovery(opts = {}) {
    const { probeEndpoints = true } = opts;
    const results = { servers: 0, resources: 0, errors: [] };

    // Phase 1: Sync servers
    try {
      const servers = await this.syncServers(opts);
      for (const server of servers) {
        await dataService.addOrUpdateServer(server);
      }
      results.servers = servers.length;
    } catch (err) {
      results.errors.push(`Server sync: ${err.message}`);
    }

    // Phase 2: Probe each server for resources (includes 402 pricing)
    if (probeEndpoints) {
      const servers = dataService.getServersSync();
      console.log(`[Discovery] Probing ${servers.length} servers for resources + pricing...`);

      for (const server of servers) {
        try {
          const endpoints = await this.probeServerResources(server.serverUrl);

          if (endpoints.length > 0) {
            const added = await dataService.bulkAddResources(endpoints);
            results.resources += endpoints.length;

            // Update server resource count
            server.resourceCount = endpoints.length;
            server.lastProbedAt = new Date().toISOString();
            await dataService.addOrUpdateServer(server);

            console.log(`[Discovery] ${server.title || server.serverUrl}: ${endpoints.length} endpoints`);
          }

          await this._sleep(300);
        } catch (err) {
          results.errors.push(`Probe ${server.serverUrl}: ${err.message}`);
        }
      }
    }

    console.log(`[Discovery] Full discovery complete. Servers: ${results.servers}, Resources: ${results.resources}`);
    return results;
  }

  // ================================================================
  //  HELPERS
  // ================================================================

  _extractSlug(url) {
    try {
      const u = new URL(url);
      return u.pathname.replace(/^\//, '') || u.hostname;
    } catch {
      return url;
    }
  }

  _extractPricing(item) {
    const accepts = item.accepts || item.pricing || [];
    if (Array.isArray(accepts) && accepts.length > 0) {
      return accepts.map(a => ({
        network: a.network || 'solana-mainnet',
        asset: a.asset || 'USDC',
        amount: a.maxAmountRequired || a.amount || 0,
      }));
    }
    return [];
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new DiscoveryService();
