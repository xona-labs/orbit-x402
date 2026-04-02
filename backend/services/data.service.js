const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CDN_BASE = process.env.CDN_BASE_URL || 'https://provey-media.sgp1.cdn.digitaloceanspaces.com/x402-data';
const CDN_CACHE_TTL = parseInt(process.env.CDN_CACHE_TTL || '300') * 1000; // 5 min default

class DataService {
  constructor() {
    this._locks = new Map();
    this._cache = new Map();   // { name -> { data, fetchedAt } }
  }

  // ─── CDN read (primary) with in-memory cache ───

  async readFromCDN(name) {
    // Check cache first
    const cached = this._cache.get(name);
    if (cached && (Date.now() - cached.fetchedAt) < CDN_CACHE_TTL) {
      return cached.data;
    }

    const url = `${CDN_BASE}/${name}.json`;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      this._cache.set(name, { data, fetchedAt: Date.now() });
      return data;
    } catch (err) {
      console.error(`[DataService] CDN fetch failed for ${name}.json:`, err.message);
      // Fallback to local file
      return this._readLocal(name);
    }
  }

  // ─── Local file read (fallback + used by sync scripts) ───

  _readLocal(name) {
    const filePath = path.join(DATA_DIR, `${name}.json`);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  /**
   * read() — sync local read. Used by sync scripts that write data.
   * For API routes serving data to frontend, use readFromCDN() instead.
   */
  read(name) {
    return this._readLocal(name);
  }

  // ─── Local file write (used by sync scripts) ───

  async _acquireLock(name) {
    while (this._locks.get(name)) {
      await new Promise(r => setTimeout(r, 50));
    }
    this._locks.set(name, true);
  }

  _releaseLock(name) {
    this._locks.delete(name);
  }

  async write(name, data) {
    await this._acquireLock(name);
    try {
      const filePath = path.join(DATA_DIR, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      // Update cache with fresh local data so reads don't go back to stale CDN
      this._cache.set(name, { data, fetchedAt: Date.now() });
    } finally {
      this._releaseLock(name);
    }
  }

  // ─── Facilitator helpers ───

  async getFacilitators() {
    const data = await this.readFromCDN('facilitators');
    return data?.facilitators || [];
  }

  // Sync-only (local write)
  getFacilitatorsSync() {
    const data = this.read('facilitators');
    return data?.facilitators || [];
  }

  async updateFacilitatorStats(facilitatorId, statsUpdate) {
    const data = this.read('facilitators');
    if (!data) return;
    const f = data.facilitators.find(f => f.id === facilitatorId);
    if (!f) return;
    Object.assign(f.stats, statsUpdate);
    await this.write('facilitators', data);
  }

  async updateFacilitatorAddressSync(facilitatorId, address, lastSyncedAt, lastSignature = null) {
    const data = this.read('facilitators');
    if (!data) return;
    const f = data.facilitators.find(f => f.id === facilitatorId);
    if (!f) return;
    const addr = f.addresses.find(a => a.address === address);
    if (addr) {
      addr.lastSyncedAt = lastSyncedAt;
      if (lastSignature) addr.lastSignature = lastSignature;
    }
    await this.write('facilitators', data);
  }

  // ─── Transfer helpers ───

  async getTransfers() {
    const data = await this.readFromCDN('transfers');
    return data?.transfers || [];
  }

  getTransfersSync() {
    const data = this.read('transfers');
    return data?.transfers || [];
  }

  async addTransfers(newTransfers) {
    const data = this.read('transfers') || { transfers: [], meta: { lastUpdated: null, totalCount: 0 } };
    const existingHashes = new Set(data.transfers.map(t => t.txHash));
    const unique = newTransfers.filter(t => !existingHashes.has(t.txHash));
    if (unique.length === 0) return 0;
    data.transfers.push(...unique);
    data.transfers.sort((a, b) => new Date(b.blockTimestamp) - new Date(a.blockTimestamp));
    data.meta.lastUpdated = new Date().toISOString();
    data.meta.totalCount = data.transfers.length;
    await this.write('transfers', data);
    return unique.length;
  }

  // ─── Server helpers ───

  async getServers() {
    const data = await this.readFromCDN('servers');
    return data?.servers || [];
  }

  getServersSync() {
    const data = this.read('servers');
    return data?.servers || [];
  }

  async addOrUpdateServer(server) {
    const data = this.read('servers') || { servers: [], meta: { lastSyncedAt: null, totalCount: 0 } };
    const key = server.serverUrl || server.url;
    const idx = data.servers.findIndex(s => (s.serverUrl || s.url) === key);
    if (idx >= 0) {
      data.servers[idx] = { ...data.servers[idx], ...server, updatedAt: new Date().toISOString() };
    } else {
      data.servers.push({ ...server, discoveredAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    data.meta.lastSyncedAt = new Date().toISOString();
    data.meta.totalCount = data.servers.length;
    await this.write('servers', data);
  }

  // ─── Resource helpers ───

  async getResources() {
    const data = await this.readFromCDN('resources');
    return data?.resources || [];
  }

  getResourcesSync() {
    const data = this.read('resources');
    return data?.resources || [];
  }

  async addOrUpdateResource(resource) {
    const data = this.read('resources') || { resources: [], meta: { lastDiscoveredAt: null, totalCount: 0 } };
    const key = resource.endpoint || resource.url;
    const idx = data.resources.findIndex(r => (r.endpoint || r.url) === key);
    if (idx >= 0) {
      data.resources[idx] = { ...data.resources[idx], ...resource, updatedAt: new Date().toISOString() };
    } else {
      data.resources.push({ ...resource, discoveredAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    data.meta.lastDiscoveredAt = new Date().toISOString();
    data.meta.totalCount = data.resources.length;
    await this.write('resources', data);
  }

  async bulkAddResources(resources) {
    const data = this.read('resources') || { resources: [], meta: { lastDiscoveredAt: null, totalCount: 0 } };
    let added = 0;
    for (const resource of resources) {
      const key = resource.endpoint || resource.url;
      const idx = data.resources.findIndex(r => (r.endpoint || r.url) === key);
      if (idx >= 0) {
        data.resources[idx] = { ...data.resources[idx], ...resource, updatedAt: new Date().toISOString() };
      } else {
        data.resources.push({ ...resource, discoveredAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        added++;
      }
    }
    data.meta.lastDiscoveredAt = new Date().toISOString();
    data.meta.totalCount = data.resources.length;
    await this.write('resources', data);
    return added;
  }
}

module.exports = new DataService();
