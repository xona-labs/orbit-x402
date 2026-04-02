const { GoogleGenAI } = require('@google/genai');
const dataService = require('./data.service');

const MODEL = 'gemini-2.0-flash';

class LLMDiscoveryService {
  constructor() {
    this._catalogCache = null;
    this._catalogBuiltAt = 0;
    this._catalogTTL = 5 * 60 * 1000; // 5 min
  }

  _getClient() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
  }

  /**
   * Build a condensed text catalog of all servers + resources.
   * Designed to fit in ~4-6K tokens for Gemini Flash.
   */
  async _buildCatalog() {
    if (this._catalogCache && (Date.now() - this._catalogBuiltAt) < this._catalogTTL) {
      return this._catalogCache;
    }

    // Use local data (freshest after sync writes locally)
    const servers = dataService.getServersSync();
    const resources = dataService.getResourcesSync();

    // Group resources by serverUrl
    const resourcesByServer = {};
    for (const r of resources) {
      const key = r.serverUrl || '';
      if (!resourcesByServer[key]) resourcesByServer[key] = [];
      resourcesByServer[key].push(r);
    }

    const lines = [];
    for (const server of servers) {
      const endpoints = resourcesByServer[server.serverUrl] || [];

      // Build endpoint list with pricing
      const endpointList = endpoints
        .slice(0, 10)
        .map(e => {
          const price = e.pricing?.[0];
          const priceStr = price ? ` ($${price.amountUsdc || (parseInt(price.amount || '0') / 1e6)})` : '';
          const desc = e.description ? ` - ${e.description}` : '';
          return `${e.method} /${e.slug}${desc}${priceStr}`;
        })
        .join('; ');
      const more = endpoints.length > 10 ? ` (+${endpoints.length - 10} more)` : '';

      lines.push([
        `[${server.title || server.serverUrl}]`,
        `URL: ${server.serverUrl}`,
        `Description: ${server.description || 'N/A'}`,
        `Chains: ${(server.chains || []).join(', ') || 'N/A'}`,
        `Facilitators: ${(server.facilitators || []).join(', ') || 'N/A'}`,
        `Stats: ${server.stats?.transactionCount || 0} txns, $${server.stats?.totalVolume || 0} volume, ${server.stats?.uniqueBuyers || 0} buyers`,
        endpoints.length > 0 ? `Endpoints (${endpoints.length}): ${endpointList}${more}` : 'Endpoints: not probed yet',
        '',
      ].join('\n'));
    }

    this._catalogCache = lines.join('\n');
    this._catalogBuiltAt = Date.now();
    return this._catalogCache;
  }

  /**
   * LLM-powered discovery search.
   * Returns ranked results with reasoning.
   */
  async discover(query) {
    const client = this._getClient();

    // Fallback to keyword search if no LLM key
    if (!client) {
      return this._keywordFallback(query);
    }

    const catalog = await this._buildCatalog();

    const systemPrompt = `You are OrbitX402 Discovery — an x402 resource search engine.

You have a catalog of x402-enabled servers below. Each server offers paid API endpoints accessible via the x402 payment protocol (HTTP 402 + USDC on Solana/Base).

Your job: given the user's search query, find the most relevant servers and return them as a JSON array ranked by relevance.

RULES:
- Return a JSON array of objects with: serverUrl, title, reason (1 sentence why it matches), relevanceScore (0-100)
- Max 10 results
- If nothing matches, return empty array []
- Infer functionality from URL paths (e.g. /api/v1/chat/completions = LLM, /api/v1/images = image generation)
- Consider chains and facilitators when the user specifies them
- Consider volume/txn stats as quality signals

CATALOG:
${catalog}`;

    try {
      const response = await client.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: query }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 2000,
        },
      });

      const text = response.text || '';
      const matches = JSON.parse(text);

      // Enrich with full server data
      const servers = await dataService.getServers();
      const resources = await dataService.getResources();

      const results = (Array.isArray(matches) ? matches : []).map(match => {
        const server = servers.find(s => s.serverUrl === match.serverUrl);
        if (!server) return null;

        const serverResources = resources.filter(r => r.serverUrl === match.serverUrl);

        return {
          ...match,
          server: {
            title: server.title,
            description: server.description,
            serverUrl: server.serverUrl,
            favicon: server.favicon,
            chains: server.chains,
            facilitators: server.facilitators,
            stats: server.stats,
            resourceCount: serverResources.length,
          },
          resources: serverResources.slice(0, 20).map(r => ({
            endpoint: r.endpoint,
            slug: r.slug,
            method: r.method,
            description: r.description,
          })),
        };
      }).filter(Boolean);

      return {
        query,
        results,
        total: results.length,
        model: MODEL,
        fallback: false,
      };
    } catch (err) {
      console.error('[Discovery] LLM error:', err.message);
      // Fallback on LLM failure
      return this._keywordFallback(query);
    }
  }

  /**
   * Simple keyword-based fallback when no LLM is available.
   */
  async _keywordFallback(query) {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const servers = await dataService.getServers();
    const resources = await dataService.getResources();

    const scored = servers.map(server => {
      const serverResources = resources.filter(r => r.serverUrl === server.serverUrl);
      const searchable = [
        server.title, server.description, server.serverUrl,
        ...(server.chains || []), ...(server.facilitators || []),
        ...serverResources.map(r => r.slug),
      ].join(' ').toLowerCase();

      const score = terms.reduce((s, term) => s + (searchable.includes(term) ? 30 : 0), 0);
      return { server, serverResources, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

    return {
      query,
      results: scored.map(s => ({
        serverUrl: s.server.serverUrl,
        title: s.server.title,
        reason: 'Keyword match',
        relevanceScore: Math.min(s.score, 100),
        server: {
          title: s.server.title,
          description: s.server.description,
          serverUrl: s.server.serverUrl,
          favicon: s.server.favicon,
          chains: s.server.chains,
          facilitators: s.server.facilitators,
          stats: s.server.stats,
          resourceCount: s.serverResources.length,
        },
        resources: s.serverResources.slice(0, 20).map(r => ({
          endpoint: r.endpoint, slug: r.slug, method: r.method, description: r.description,
        })),
      })),
      total: scored.length,
      model: null,
      fallback: true,
    };
  }
}

module.exports = new LLMDiscoveryService();
