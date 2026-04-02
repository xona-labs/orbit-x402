const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3088';

async function fetchAPI(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getStats() { return fetchAPI('/api/stats'); }
export async function getFacilitators() { return fetchAPI('/api/facilitators'); }
export async function getFacilitator(id: string) { return fetchAPI(`/api/facilitators/${id}`); }

export async function getTransfers(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchAPI(`/api/transfers${qs}`);
}

export async function getServers(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchAPI(`/api/servers${qs}`);
}

export async function getServerDetail(url: string) {
  return fetchAPI(`/api/servers/detail?url=${encodeURIComponent(url)}`);
}

export async function getResources(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchAPI(`/api/resources${qs}`);
}

export async function triggerScan() {
  const res = await fetch(`${API_BASE}/api/scan/trigger`, { method: 'POST' });
  return res.json();
}

export async function syncServers() {
  const res = await fetch(`${API_BASE}/api/servers/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  return res.json();
}

export async function probeServer(url: string) {
  const res = await fetch(`${API_BASE}/api/servers/probe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
  return res.json();
}

export async function probeAllServers() {
  const res = await fetch(`${API_BASE}/api/servers/probe-all`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  return res.json();
}

// Types
export interface Facilitator {
  id: string; name: string; url: string; discoveryUrl: string; color: string;
  image: string; network: string;
  addresses: { address: string; dateOfFirstTransaction: string; lastSyncedAt: string | null }[];
  token: { symbol: string; address: string; decimals: number };
  stats: { totalTransactions: number; totalVolume: number; uniqueCounterparties: number; lastActivityAt: string | null };
}

export interface Transfer {
  txHash: string; facilitatorId: string; facilitatorAddress: string;
  direction: string; sender: string; receiver: string;
  amount: number; asset: string; network: string; blockHeight: number; blockTimestamp: string;
}

export interface Server {
  serverUrl: string; title: string; description: string; favicon: string;
  chains: string[]; facilitators: string[]; recipients: string[];
  stats: { transactionCount: number; totalVolume: number; uniqueBuyers: number };
  resourceCount: number; lastProbedAt: string | null; lastActivityAt: string | null;
}

export interface Resource {
  endpoint: string; slug: string; serverUrl: string; method: string;
  description: string; pricing: any[]; status: string;
  discoveredAt: string; updatedAt: string;
}
