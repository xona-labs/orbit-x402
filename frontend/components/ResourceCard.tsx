'use client';

interface ResourceCardProps {
  resource: any;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10',
  POST: 'text-blue-400 bg-blue-500/10',
  PUT: 'text-amber-400 bg-amber-500/10',
  DELETE: 'text-red-400 bg-red-500/10',
};

const CHAIN_COLORS: Record<string, string> = {
  solana: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  base: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  polygon: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  avalanche: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function getChainStyle(chain: string) {
  const key = chain.toLowerCase();
  for (const [k, v] of Object.entries(CHAIN_COLORS)) {
    if (key.includes(k)) return v;
  }
  return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  const methodColor = METHOD_COLORS[resource.method] || 'text-neutral-400 bg-neutral-500/10';
  const hasStats = resource.stats && (resource.stats.transactionCount > 0 || resource.stats.totalVolume > 0);

  return (
    <div className="glass-card p-5 transition-all duration-200 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${methodColor}`}>
            {resource.method}
          </span>
          {resource.status === 'active' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
              active
            </span>
          )}
        </div>
        {resource.source && (
          <span className="text-[10px] text-neutral-600">via {resource.source}</span>
        )}
      </div>

      {/* Title / Name */}
      <h3 className="text-[13px] font-medium text-white mb-1 leading-snug line-clamp-2">
        {resource.title || resource.description || resource.slug || resource.url}
      </h3>

      {resource.description && resource.title && resource.description !== resource.title && (
        <p className="text-[11px] text-neutral-500 mb-2 line-clamp-2">{resource.description}</p>
      )}

      {resource.serverUrl && (
        <div className="text-[11px] text-neutral-600 font-mono truncate mb-2">
          {resource.serverUrl}
        </div>
      )}

      {/* Tags */}
      {resource.tags && resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {resource.tags.slice(0, 4).map((tag: string, i: number) => (
            <span key={i} className="text-[10px] bg-white/[0.04] text-neutral-500 px-1.5 py-0.5 rounded border border-white/[0.04]">
              {tag}
            </span>
          ))}
          {resource.tags.length > 4 && (
            <span className="text-[10px] text-neutral-600">+{resource.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Chains */}
      {resource.chains && resource.chains.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {resource.chains.map((chain: string, i: number) => (
            <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${getChainStyle(chain)}`}>
              {chain}
            </span>
          ))}
        </div>
      )}

      {/* Stats from x402scan */}
      {hasStats && (
        <div className="grid grid-cols-3 gap-2 mb-3 mt-auto pt-3 border-t border-white/[0.04]">
          <div>
            <div className="text-[13px] font-semibold text-white">{resource.stats.transactionCount?.toLocaleString()}</div>
            <div className="text-[10px] text-neutral-500">Txns</div>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white">${resource.stats.totalVolume?.toLocaleString()}</div>
            <div className="text-[10px] text-neutral-500">Volume</div>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white">{resource.stats.uniqueBuyers?.toLocaleString()}</div>
            <div className="text-[10px] text-neutral-500">Buyers</div>
          </div>
        </div>
      )}

      {/* Facilitators */}
      {resource.facilitators && resource.facilitators.length > 0 && (
        <div className="text-[10px] text-neutral-600 mt-auto">
          Facilitators: {resource.facilitators.join(', ')}
        </div>
      )}

      {/* Pricing fallback */}
      {!hasStats && resource.pricing && resource.pricing.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {resource.pricing.map((p: any, i: number) => (
            <span key={i} className="text-[11px] bg-white/[0.04] text-neutral-400 px-2 py-0.5 rounded-md border border-white/[0.04]">
              {typeof p.amount === 'number' && p.amount > 0 ? `$${p.amount}` : 'Pay-per-use'} {p.asset}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
