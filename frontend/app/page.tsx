'use client';

import { useEffect, useState } from 'react';
import { getStats, getFacilitators, getTransfers } from '@/lib/api';
import StatsBar from '@/components/StatsBar';
import FacilitatorCard from '@/components/FacilitatorCard';
import TransferTable from '@/components/TransferTable';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3088';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [facilitators, setFacilitators] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState('24h');

  // Discovery search state
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<any>(null);

  const load = async (p?: string) => {
    try {
      setLoading(true);
      const currentPeriod = p !== undefined ? p : period;
      const statsParams = currentPeriod ? `?period=${currentPeriod}` : '';
      const [s, f, t] = await Promise.all([
        fetch(`${API_BASE}/api/stats${statsParams}`).then(r => r.json()),
        getFacilitators(),
        getTransfers({ limit: '20' }),
      ]);
      setStats(s);
      setFacilitators(f.facilitators || []);
      setTransfers(t.transfers || []);
      setError(null);
    } catch (err: any) {
      setError('Failed to load data. Make sure the backend is running on port 3088.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    load(p);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API_BASE}/api/scan/trigger`, { method: 'POST' });
      await res.json();
      await load();
    } catch (err) {
      setError('Scan failed. Check backend logs.');
    } finally {
      setScanning(false);
    }
  };

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
          <div className="w-6 h-6 border-2 border-neutral-600 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const overview = stats?.overview || {};

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-gradient dot-grid border-b border-white/[0.04] relative overflow-hidden">
        {/* Decorative vectors */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Top-left circuit lines */}
          <svg className="absolute -top-6 -left-10 w-72 h-72 opacity-[0.04]" viewBox="0 0 300 300" fill="none" stroke="white" strokeWidth="1">
            <path d="M20 120 L80 120 L80 60 L160 60" />
            <path d="M20 160 L60 160 L60 200 L120 200 L120 140 L200 140" />
            <path d="M40 220 L100 220 L100 260 L180 260" />
            <circle cx="80" cy="120" r="3" fill="white" />
            <circle cx="160" cy="60" r="3" fill="white" />
            <circle cx="120" cy="200" r="3" fill="white" />
            <circle cx="200" cy="140" r="3" fill="white" />
            <circle cx="180" cy="260" r="3" fill="white" />
          </svg>

          {/* Top-right network nodes */}
          <svg className="absolute -top-4 -right-8 w-80 h-80 opacity-[0.04]" viewBox="0 0 320 320" fill="none" stroke="white" strokeWidth="1">
            <path d="M280 80 L220 80 L220 140 L160 140" />
            <path d="M300 140 L240 140 L240 200 L180 200" />
            <path d="M260 40 L200 40 L200 100 L140 100 L140 180" />
            <circle cx="220" cy="80" r="3" fill="white" />
            <circle cx="160" cy="140" r="3" fill="white" />
            <circle cx="240" cy="200" r="3" fill="white" />
            <circle cx="200" cy="40" r="3" fill="white" />
            <circle cx="140" cy="180" r="3" fill="white" />
          </svg>

          {/* Bottom-left hexagonal pattern */}
          <svg className="absolute -bottom-10 -left-6 w-64 h-64 opacity-[0.03]" viewBox="0 0 260 260" fill="none" stroke="white" strokeWidth="0.8">
            <polygon points="60,30 90,15 120,30 120,60 90,75 60,60" />
            <polygon points="120,30 150,15 180,30 180,60 150,75 120,60" />
            <polygon points="90,75 120,60 150,75 150,105 120,120 90,105" />
            <polygon points="60,120 90,105 120,120 120,150 90,165 60,150" />
            <polygon points="120,120 150,105 180,120 180,150 150,165 120,150" />
          </svg>

          {/* Bottom-right abstract paths */}
          <svg className="absolute -bottom-8 -right-12 w-72 h-72 opacity-[0.03]" viewBox="0 0 300 300" fill="none" stroke="white" strokeWidth="0.8">
            <path d="M180 280 L180 220 L240 220 L240 160 L300 160" />
            <path d="M200 260 L260 260 L260 200 L300 200" />
            <path d="M220 300 L220 240 L280 240 L280 180" />
            <circle cx="180" cy="220" r="2.5" fill="white" />
            <circle cx="240" cy="160" r="2.5" fill="white" />
            <circle cx="260" cy="260" r="2.5" fill="white" />
            <circle cx="280" cy="180" r="2.5" fill="white" />
          </svg>

          {/* Center floating dots */}
          <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] opacity-[0.025]" viewBox="0 0 600 400" fill="white">
            <circle cx="80" cy="60" r="1.5" />
            <circle cx="520" cy="80" r="1.5" />
            <circle cx="150" cy="340" r="1.5" />
            <circle cx="450" cy="320" r="1.5" />
            <circle cx="40" cy="200" r="1" />
            <circle cx="560" cy="200" r="1" />
            <circle cx="200" cy="100" r="1" />
            <circle cx="400" cy="100" r="1" />
            <circle cx="300" cy="350" r="1" />
            <circle cx="100" cy="280" r="1.5" />
            <circle cx="500" cy="260" r="1.5" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-16 pb-14 relative">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-neutral-400 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Discover resources on x402 Solana
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4 animate-fade-in leading-tight">
              x402 Discovery Layer
            </h1>
            <p className="text-neutral-500 text-base md:text-lg mb-8 animate-fade-in-delay leading-relaxed">
              Automate your agent's discovery of paid API resources. Search x402 servers with natural language, integrate in one step with our Skill MD.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="animate-fade-in-delay-2">
              <div className="relative max-w-lg mx-auto">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="find me cheapest image generation..."
                  className="search-input w-full pl-11 pr-20 py-3.5 text-[14px] text-white placeholder:text-neutral-600"
                  disabled={searching}
                />
                {searching ? (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
                  </div>
                ) : search.trim() && (
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-md bg-white/[0.08] text-[12px] text-neutral-300 hover:bg-white/[0.14] transition-all"
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-[13px] font-medium hover:bg-neutral-200 transition-all"
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-[13px] font-medium hover:bg-white/[0.1] transition-all"
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
        <section className="border-b border-white/[0.04]">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="section-label">Discovery Results</span>
                <span className="text-[12px] text-neutral-500 ml-2">
                  {discoveryResults.total} match{discoveryResults.total !== 1 ? 'es' : ''} for "{discoveryResults.query}"
                  {discoveryResults.fallback && (
                    <span className="ml-1 text-amber-500/60">(keyword fallback)</span>
                  )}
                  {discoveryResults.model && (
                    <span className="ml-1 text-neutral-600">via {discoveryResults.model}</span>
                  )}
                </span>
              </div>
              <button
                onClick={clearSearch}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[12px] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                Clear
              </button>
            </div>

            {discoveryResults.total === 0 ? (
              <div className="glass-card p-8 text-center text-neutral-500 text-sm">
                No matches found. Try a different query.
              </div>
            ) : (
              <div className="space-y-4">
                {discoveryResults.results.map((result: any, i: number) => (
                  <a
                    key={result.serverUrl}
                    href={`/servers/${encodeURIComponent(result.serverUrl)}`}
                    className="block glass-card p-5 hover:border-white/[0.12] transition-all duration-200"
                  >
                    {/* Server header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.06] text-white text-[13px] font-bold flex-shrink-0">
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
                          <h3 className="text-[15px] font-medium text-white truncate">
                            {result.server?.title || result.title || result.serverUrl}
                          </h3>
                          <span className="text-[11px] text-neutral-600 font-mono flex-shrink-0">
                            {result.relevanceScore}%
                          </span>
                        </div>
                        <p className="text-[12px] text-neutral-500 mt-0.5">{result.reason}</p>
                      </div>
                    </div>

                    {/* Server meta */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 ml-11">
                      {result.server?.chains?.map((c: string) => (
                        <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          c.toLowerCase() === 'solana'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>{c}</span>
                      ))}
                      {result.server?.facilitators?.map((f: string) => (
                        <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-neutral-500 border border-white/[0.04]">{f}</span>
                      ))}
                      {result.server?.stats && (
                        <span className="text-[10px] text-neutral-600">
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
                              r.method === 'GET' ? 'text-emerald-400 bg-emerald-500/10' :
                              r.method === 'POST' ? 'text-blue-400 bg-blue-500/10' :
                              'text-neutral-400 bg-neutral-500/10'
                            }`}>{r.method}</span>
                            <span className="text-[11px] font-mono text-neutral-400 truncate">/{r.slug}</span>
                            {r.description && (
                              <span className="text-[11px] text-neutral-600 truncate hidden md:inline">— {r.description}</span>
                            )}
                          </div>
                        ))}
                        {result.resources.length > 5 && (
                          <span className="text-[11px] text-neutral-600 ml-7">
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
          <div className="glass-card p-4 border-amber-500/20 text-amber-400/80 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <StatsBar stats={stats} period={period} onPeriodChange={handlePeriodChange} />

        {/* Facilitators */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <span className="section-label">Facilitators</span>
            <a href="/facilitators" className="text-[13px] text-neutral-500 hover:text-white transition-colors">
              View all
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {facilitators.map(f => (
              <FacilitatorCard
                key={f.id}
                facilitator={f}
                maxVolume={Math.max(...facilitators.map((ff: any) => ff.stats?.totalVolume || 0), 1)}
              />
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <span className="section-label">Recent Transactions</span>
            <a href="/transfers" className="text-[13px] text-neutral-500 hover:text-white transition-colors">
              View all
            </a>
          </div>
          <TransferTable transfers={transfers} />
        </div>
      </div>
    </div>
  );
}
