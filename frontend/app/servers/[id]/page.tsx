'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getServerDetail } from '@/lib/api';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10',
  POST: 'text-blue-400 bg-blue-500/10',
  PUT: 'text-amber-400 bg-amber-500/10',
  PATCH: 'text-orange-400 bg-orange-500/10',
  DELETE: 'text-red-400 bg-red-500/10',
};

const CHAIN_COLORS: Record<string, string> = {
  solana: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  base: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  polygon: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

function getChainStyle(chain: string) {
  const key = chain.toLowerCase();
  for (const [k, v] of Object.entries(CHAIN_COLORS)) {
    if (key.includes(k)) return v;
  }
  return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
}

function timeAgo(ts: string | null) {
  if (!ts) return '--';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ServerDetailPage() {
  const params = useParams();
  const serverUrl = decodeURIComponent(params.id as string);

  const [server, setServer] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getServerDetail(serverUrl);
      setServer(data.server);
      setResources(data.resources || []);
      setError(null);
    } catch (err: any) {
      setError('Server not found. Try syncing from the servers page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [serverUrl]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="glass-card p-8 text-center">
          <p className="text-neutral-400 mb-4">{error || 'Server not found.'}</p>
          <a href="/servers" className="text-[13px] text-white hover:underline">Back to servers</a>
        </div>
      </div>
    );
  }

  let hostname = serverUrl;
  try { hostname = new URL(serverUrl).hostname; } catch {}

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px]">
        <a href="/servers" className="text-neutral-500 hover:text-white transition-colors">Servers</a>
        <span className="text-neutral-600">/</span>
        <span className="text-neutral-300">{hostname}</span>
      </div>

      {/* Server Header */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4 mb-6">
          {server.favicon && (
            <img src={server.favicon} alt="" className="w-12 h-12 rounded-lg"
              onError={e => (e.currentTarget.style.display = 'none')} />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white mb-1">
              {server.title || hostname}
            </h1>
            <a href={server.serverUrl} target="_blank" rel="noopener"
              className="text-[13px] text-neutral-500 hover:text-white font-mono transition-colors">
              {server.serverUrl}
            </a>
          </div>
        </div>

        {server.description && (
          <p className="text-[14px] text-neutral-400 leading-relaxed mb-6">{server.description}</p>
        )}

        {/* Chains + facilitators */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {(server.chains || []).map((c: string) => (
            <span key={c} className={`text-[11px] px-2 py-0.5 rounded border ${getChainStyle(c)}`}>{c}</span>
          ))}
          {(server.facilitators || []).map((f: string) => (
            <span key={f} className="text-[11px] px-2 py-0.5 rounded bg-white/[0.04] text-neutral-400 border border-white/[0.04]">
              {f}
            </span>
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Transactions', value: (server.stats?.transactionCount || 0).toLocaleString() },
            { label: 'Volume (USDC)', value: `$${(server.stats?.totalVolume || 0).toLocaleString()}` },
            { label: 'Unique Buyers', value: (server.stats?.uniqueBuyers || 0).toLocaleString() },
            { label: 'Endpoints', value: resources.length || server.resourceCount || 0 },
            { label: 'Last Activity', value: timeAgo(server.lastActivityAt) },
          ].map(s => (
            <div key={s.label} className="glass-card p-3 text-center">
              <div className="text-lg font-semibold text-white">{s.value}</div>
              <div className="text-[11px] text-neutral-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recipients */}
        {server.recipients && server.recipients.length > 0 && (
          <div className="mt-6">
            <span className="section-label">Payment Recipients</span>
            <div className="mt-2 space-y-1.5">
              {server.recipients.map((addr: string) => (
                <a key={addr} href={`https://solscan.io/account/${addr}`} target="_blank" rel="noopener"
                  className="block glass-card px-3 py-2 font-mono text-[12px] text-neutral-400 hover:text-white truncate transition-colors">
                  {addr}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resources / Endpoints */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="section-label">Resources</span>
            <span className="text-[12px] text-neutral-500 ml-2">
              {resources.length} endpoint{resources.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {resources.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-neutral-500 text-sm">
              No endpoints discovered yet. Data syncs automatically every 30 minutes.
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-4 py-3 text-left text-[11px] text-neutral-500 uppercase tracking-wider font-medium w-16">Method</th>
                  <th className="px-4 py-3 text-left text-[11px] text-neutral-500 uppercase tracking-wider font-medium">Endpoint</th>
                  <th className="px-4 py-3 text-left text-[11px] text-neutral-500 uppercase tracking-wider font-medium">Description</th>
                  <th className="px-4 py-3 text-right text-[11px] text-neutral-500 uppercase tracking-wider font-medium w-24">Price</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r: any, i: number) => {
                  const price = r.pricing?.[0];
                  const priceDisplay = price
                    ? `$${(price.amountUsdc || parseInt(price.amount || '0') / 1e6).toFixed(2)}`
                    : null;

                  return (
                    <tr key={r.endpoint + i} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                          METHOD_COLORS[r.method] || 'text-neutral-400 bg-neutral-500/10'
                        }`}>{r.method}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-mono text-[12px] text-neutral-300 truncate max-w-md">
                          /{r.slug || r.endpoint}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-neutral-500 max-w-xs truncate">
                        {r.description || ''}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {priceDisplay ? (
                          <span className="text-[12px] text-white font-mono">{priceDisplay}</span>
                        ) : (
                          <span className="text-[11px] text-neutral-600">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
