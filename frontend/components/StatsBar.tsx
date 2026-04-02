'use client';

interface StatsBarProps {
  stats: any;
  period: string;
  onPeriodChange: (period: string) => void;
}

const statItems = [
  { key: 'totalVolume', label: 'Volume', format: (v: number) => `$${v.toLocaleString()}` },
  { key: 'totalTransactions', label: 'Transactions', format: (v: number) => v.toLocaleString() },
  { key: 'totalServers', label: 'Servers', format: (v: number) => v.toLocaleString() },
  { key: 'totalResources', label: 'Endpoints', format: (v: number) => v.toLocaleString() },
];

const periods = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '', label: 'All' },
];

export default function StatsBar({ stats, period, onPeriodChange }: StatsBarProps) {
  const overview = stats?.overview || {};
  const periodLabel = stats?.periodLabel || 'All Time';

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Network Overview</h2>
          <p className="text-[13px] text-neutral-500">
            x402 protocol activity on Solana — {periodLabel}
          </p>
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.06]">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-all ${
                period === p.value
                  ? 'bg-white text-black'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statItems.map(item => {
          const value = (overview as any)[item.key] ?? 0;
          return (
            <div key={item.key} className="glass-card p-4 stat-card cursor-default">
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">
                {item.label}
              </div>
              <div className="text-xl font-semibold text-white">
                {item.format(value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
