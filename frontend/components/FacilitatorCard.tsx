'use client';

import type { Facilitator } from '@/lib/api';

const FACILITATOR_ICONS: Record<string, string> = {
  payai: '/facilitators/payai.png',
  dexter: '/facilitators/dexter.svg',
  relai: '/facilitators/relai.webp',
};

interface FacilitatorCardProps {
  facilitator: Facilitator;
  maxVolume?: number;
}

export default function FacilitatorCard({ facilitator, maxVolume = 1 }: FacilitatorCardProps) {
  const volumePercent = maxVolume > 0 ? (facilitator.stats.totalVolume / maxVolume) * 100 : 0;
  const icon = FACILITATOR_ICONS[facilitator.id];

  return (
    <a href={`/facilitators?id=${facilitator.id}`} className="block">
      <div className="glass-card p-5 transition-all duration-200 hover:-translate-y-0.5">
        <div className="flex items-center gap-3 mb-5">
          {icon ? (
            <img src={icon} alt={facilitator.name} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: facilitator.color + '20', border: `1.5px solid ${facilitator.color}50` }}
            >
              {facilitator.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-[15px]">{facilitator.name}</h3>
            <p className="text-[12px] text-neutral-500">
              {facilitator.addresses.length} address{facilitator.addresses.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: facilitator.color, boxShadow: `0 0 8px ${facilitator.color}40` }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <div className="text-[15px] font-semibold text-white">{facilitator.stats.totalTransactions.toLocaleString()}</div>
            <div className="text-[11px] text-neutral-500">Txns</div>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-white">${facilitator.stats.totalVolume.toLocaleString()}</div>
            <div className="text-[11px] text-neutral-500">Volume</div>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-white">{facilitator.stats.uniqueCounterparties}</div>
            <div className="text-[11px] text-neutral-500">Users</div>
          </div>
        </div>

        {/* Volume bar */}
        <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.max(volumePercent, 3)}%`, backgroundColor: facilitator.color }}
          />
        </div>

        {/* First address */}
        <div className="mt-3">
          <div className="text-[11px] text-neutral-600 font-mono truncate">
            {facilitator.addresses[0]?.address}
          </div>
        </div>
      </div>
    </a>
  );
}
