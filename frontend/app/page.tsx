'use client';

import { useEffect, useState } from 'react';
import { getServers, getResources } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3088';

export default function Dashboard() {
  const [topServers, setTopServers] = useState<any[]>([]);
  const [recentResources, setRecentResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<any>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [srv, res] = await Promise.all([
        getServers({ chain: 'solana', limit: '6' }),
        getResources({ limit: '8' }),
      ]);
      const sorted = (srv.servers || []).slice().sort((a: any, b: any) =>
        (b.stats?.totalVolume || 0) - (a.stats?.totalVolume || 0)
      );
      setTopServers(sorted.slice(0, 6));
      setRecentResources((res.resources || []).slice(0, 8));
      setError(null);
    } catch (err: any) {
      setError('Failed to load data. Make sure the backend is running on port 3088.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;

    setSearching(true);
    setDiscoveryResults(null);

    try {
      const res = await fetch(`${API_BASE}/api/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setDiscoveryResults(data);
    } catch (err) {
      setError('Discovery search failed.');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearch('');
    setDiscoveryResults(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground/55 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-gradient dot-grid border-b border-foreground/[0.06] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-14 relative">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/[0.05] border border-foreground/[0.08] text-[12px] text-foreground/60 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Discover resources on x402 Solana
              </div>
            </div>

            <h1 className="font-display text-5xl md:text-6xl text-gradient-chrome mb-4 animate-fade-in leading-[1.05] text-balance">
              x402 Discovery Layer
            </h1>
            <p className="text-foreground/60 text-base md:text-lg mb-8 animate-fade-in-delay leading-relaxed text-pretty">
              Automate your agent's discovery of paid API resources. Search x402 servers with natural language, integrate in one step with our Skill MD.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="animate-fade-in-delay-2">
              <div className="relative max-w-lg mx-auto">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="find me cheapest image generation..."
                  className="search-input w-full pl-11 pr-20 py-3.5 text-[14px] text-foreground placeholder:text-foreground/40"
                  disabled={searching}
                />
                {searching ? (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                  </div>
                ) : search.trim() && (
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-md bg-foreground/[0.1] text-[12px] text-foreground/80 hover:bg-foreground/[0.16] transition-all"
                  >
                    Search
                  </button>
                )}
              </div>
            </form>

            {/* CTA links */}
            {!discoveryResults && (
              <div className="flex items-center justify-center gap-4 mt-6 animate-fade-in-delay-2">
                <a
                  href="/docs"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  API Docs
                </a>
                <a
                  href={`${API_BASE}/skill.md`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground/[0.06] border border-foreground/[0.12] text-foreground text-[13px] font-medium hover:bg-foreground/[0.1] transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Skill MD
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Discovery Results */}
      {discoveryResults && (
        <section className="border-b border-foreground/[0.06]">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="section-label">Discovery Results</span>
                <span className="text-[12px] text-foreground/55 ml-2">
                  {discoveryResults.total} match{discoveryResults.total !== 1 ? 'es' : ''} for "{discoveryResults.query}"
                  {discoveryResults.fallback && (
                    <span className="ml-1 text-amber-500/70">(keyword fallback)</span>
                  )}
                  {discoveryResults.model && (
                    <span className="ml-1 text-foreground/40">via {discoveryResults.model}</span>
                  )}
                </span>
              </div>
              <button
                onClick={clearSearch}
                className="px-3 py-1.5 rounded-lg bg-foreground/[0.05] border border-foreground/[0.1] text-[12px] text-foreground/60 hover:text-foreground hover:bg-foreground/[0.1] transition-all"
              >
                Clear
              </button>
            </div>

            {discoveryResults.total === 0 ? (
              <div className="glass-card p-8 text-center text-foreground/55 text-sm">
                No matches found. Try a different query.
              </div>
            ) : (
              <div className="space-y-4">
                {discoveryResults.results.map((result: any, i: number) => (
                  <a
                    key={result.serverUrl}
                    href={`/servers/${encodeURIComponent(result.serverUrl)}`}
                    className="block glass-card p-5 transition-all duration-200"
                  >
                    {/* Server header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-foreground/[0.08] text-foreground text-[13px] font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      {result.server?.favicon && (
                        <img
                          src={result.server.favicon}
                          alt=""
                          className="w-6 h-6 rounded mt-0.5 flex-shrink-0"
                          onError={e => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[15px] font-medium text-foreground truncate">
                            {result.server?.title || result.title || result.serverUrl}
                          </h3>
                          <span className="text-[11px] text-foreground/45 font-mono flex-shrink-0">
                            {result.relevanceScore}%
                          </span>
                        </div>
                        <p className="text-[12px] text-foreground/60 mt-0.5">{result.reason}</p>
                      </div>
                    </div>

                    {/* Server meta */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 ml-11">
                      {result.server?.chains?.map((c: string) => (
                        <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          c.toLowerCase() === 'solana'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        }`}>{c}</span>
                      ))}
                      {result.server?.stats && (
                        <span className="text-[10px] text-foreground/45">
                          {result.server.stats.transactionCount} txns | ${result.server.stats.totalVolume} vol
                        </span>
                      )}
                    </div>

                    {/* Endpoints preview */}
                    {result.resources && result.resources.length > 0 && (
                      <div className="ml-11 space-y-1">
                        {result.resources.slice(0, 5).map((r: any, j: number) => (
                          <div key={r.endpoint + j} className="flex items-center gap-2">
                            <span className={`text-[9px] font-mono font-semibold px-1 py-0.5 rounded ${
                              r.method === 'GET' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10' :
                              r.method === 'POST' ? 'text-blue-700 dark:text-blue-400 bg-blue-500/10' :
                              'text-foreground/70 bg-foreground/[0.08]'
                            }`}>{r.method}</span>
                            <span className="text-[11px] font-mono text-foreground/70 truncate">/{r.slug}</span>
                            {r.description && (
                              <span className="text-[11px] text-foreground/45 truncate hidden md:inline">— {r.description}</span>
                            )}
                          </div>
                        ))}
                        {result.resources.length > 5 && (
                          <span className="text-[11px] text-foreground/45 ml-7">
                            +{result.resources.length - 5} more endpoints
                          </span>
                        )}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {error && (
          <div className="glass-card p-4 border-amber-500/30 text-amber-700 dark:text-amber-400/80 text-sm">
            {error}
          </div>
        )}

        {/* Top Servers */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <span className="section-label">Top Servers</span>
            <a href="/servers" className="text-[13px] text-foreground/55 hover:text-foreground transition-colors">
              View all
            </a>
          </div>
          {topServers.length === 0 ? (
            <div className="glass-card p-8 text-center text-foreground/55 text-sm">No servers indexed yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topServers.map((s: any) => {
                let hostname = s.serverUrl;
                try { hostname = new URL(s.serverUrl).hostname; } catch {}
                return (
                  <a
                    key={s.serverUrl}
                    href={`/servers/${encodeURIComponent(s.serverUrl)}`}
                    className="block glass-card p-5 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {s.favicon && (
                        <img src={s.favicon} alt="" className="w-7 h-7 rounded mt-0.5"
                          onError={e => (e.currentTarget.style.display = 'none')} />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-medium text-foreground leading-snug line-clamp-1">
                          {s.title || hostname}
                        </h3>
                        <span className="text-[11px] text-foreground/55 font-mono truncate block">
                          {hostname}
                        </span>
                      </div>
                    </div>
                    {s.description && (
                      <p className="text-[12px] text-foreground/60 line-clamp-2 mb-3">{s.description}</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-foreground/[0.08]">
                      <div>
                        <div className="text-[14px] font-semibold text-foreground">{(s.stats?.transactionCount || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-foreground/55">Txns</div>
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-foreground">${(s.stats?.totalVolume || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-foreground/55">Volume</div>
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-foreground">{s.resourceCount || '--'}</div>
                        <div className="text-[10px] text-foreground/55">Endpoints</div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Endpoints */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <span className="section-label">Recent Endpoints</span>
            <a href="/servers" className="text-[13px] text-foreground/55 hover:text-foreground transition-colors">
              Browse servers
            </a>
          </div>
          {recentResources.length === 0 ? (
            <div className="glass-card p-8 text-center text-foreground/55 text-sm">No endpoints discovered yet.</div>
          ) : (
            <div className="glass-card divide-y divide-foreground/[0.08]">
              {recentResources.map((r: any, i: number) => {
                const price = r.pricing?.[0];
                const priceLabel = price
                  ? (price.amountUsdc != null ? `$${price.amountUsdc}` : (price.amount ? `$${(parseInt(price.amount) / 1e6).toFixed(4)}` : ''))
                  : '';
                let hostname = r.serverUrl;
                try { hostname = new URL(r.serverUrl).hostname; } catch {}
                const methodColor =
                  r.method === 'GET' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10' :
                  r.method === 'POST' ? 'text-blue-700 dark:text-blue-400 bg-blue-500/10' :
                  'text-foreground/70 bg-foreground/[0.08]';
                return (
                  <a
                    key={(r.endpoint || '') + i}
                    href={`/servers/${encodeURIComponent(r.serverUrl)}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.03] transition-colors"
                  >
                    <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${methodColor}`}>
                      {r.method}
                    </span>
                    <span className="text-[12px] font-mono text-foreground/85 truncate flex-shrink-0 max-w-[200px]">
                      /{r.slug}
                    </span>
                    <span className="text-[11px] text-foreground/55 truncate flex-1 hidden md:block">
                      {r.description || hostname}
                    </span>
                    <span className="text-[11px] text-foreground/55 font-mono truncate hidden lg:block max-w-[180px]">
                      {hostname}
                    </span>
                    {priceLabel && (
                      <span className="text-[11px] text-foreground font-mono flex-shrink-0">
                        {priceLabel}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
