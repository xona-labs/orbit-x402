'use client';

import { useEffect, useState } from 'react';
import { getServers } from '@/lib/api';

export default function ServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { chain: 'solana' };
      if (search) params.search = search;
      const data = await getServers(params);
      setServers(data.servers || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">x402 Servers</h1>
        <p className="text-neutral-500 text-sm">
          Pay-per-use API servers available on the Solana network
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input type="text" placeholder="Search servers..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input w-full pl-9 pr-4 py-2 text-[13px] text-white placeholder:text-neutral-600" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-6 h-6 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
        </div>
      ) : servers.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-neutral-500 text-sm">No servers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((s: any) => {
            let hostname = s.serverUrl;
            try { hostname = new URL(s.serverUrl).hostname; } catch {}

            return (
              <a key={s.serverUrl} href={`/servers/${encodeURIComponent(s.serverUrl)}`}
                className="block glass-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12]">
                <div className="flex items-start gap-3 mb-3">
                  {s.favicon && (
                    <img src={s.favicon} alt="" className="w-7 h-7 rounded mt-0.5"
                      onError={e => (e.currentTarget.style.display = 'none')} />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-medium text-white leading-snug line-clamp-1">
                      {s.title || hostname}
                    </h3>
                    <span className="text-[11px] text-neutral-500 font-mono truncate block">
                      {hostname}
                    </span>
                  </div>
                </div>

                {s.description && (
                  <p className="text-[12px] text-neutral-500 line-clamp-2 mb-3">{s.description}</p>
                )}

                {/* Facilitators */}
                {(s.facilitators || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {s.facilitators.map((f: string) => (
                      <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-neutral-500 border border-white/[0.04]">{f}</span>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.04]">
                  <div>
                    <div className="text-[14px] font-semibold text-white">{(s.stats?.transactionCount || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-neutral-500">Transactions</div>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-white">${(s.stats?.totalVolume || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-neutral-500">Volume</div>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-white">{s.resourceCount || '--'}</div>
                    <div className="text-[10px] text-neutral-500">Endpoints</div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
