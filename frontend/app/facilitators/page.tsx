'use client';

import { useEffect, useState } from 'react';
import { getFacilitators, getTransfers } from '@/lib/api';
import type { Facilitator, Transfer } from '@/lib/api';
import FacilitatorCard from '@/components/FacilitatorCard';
import TransferTable from '@/components/TransferTable';

const FACILITATOR_ICONS: Record<string, string> = {
  payai: '/facilitators/payai.png',
  dexter: '/facilitators/dexter.svg',
  relai: '/facilitators/relai.webp',
};

export default function FacilitatorsPage() {
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const f = await getFacilitators();
        setFacilitators(f.facilitators || []);
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) setSelectedId(id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    getTransfers({ facilitator: selectedId, limit: '50' })
      .then(data => setTransfers(data.transfers || []))
      .catch(console.error);
  }, [selectedId]);

  const selected = facilitators.find(f => f.id === selectedId);
  const maxVolume = Math.max(...facilitators.map(f => f.stats?.totalVolume || 0), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Facilitators</h1>
        <p className="text-neutral-500 text-sm">x402 payment facilitators on the Solana network</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {facilitators.map(f => (
          <div key={f.id} onClick={() => setSelectedId(f.id)} className="cursor-pointer">
            <FacilitatorCard facilitator={f} maxVolume={maxVolume} />
          </div>
        ))}
      </div>

      {selected && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4 mb-6">
              {FACILITATOR_ICONS[selected.id] ? (
                <img src={FACILITATOR_ICONS[selected.id]} alt={selected.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                  style={{ backgroundColor: selected.color + '20', border: `1.5px solid ${selected.color}50` }}
                >
                  {selected.name.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                <a href={selected.url} target="_blank" rel="noopener" className="text-sm text-neutral-500 hover:text-white transition-colors">
                  {selected.url}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Transactions', value: selected.stats.totalTransactions.toLocaleString() },
                { label: 'Volume (USDC)', value: `$${selected.stats.totalVolume.toLocaleString()}` },
                { label: 'Unique Users', value: selected.stats.uniqueCounterparties },
                { label: 'Addresses', value: selected.addresses.length },
              ].map(s => (
                <div key={s.label} className="glass-card p-3 text-center">
                  <div className="text-lg font-semibold text-white">{s.value}</div>
                  <div className="text-[11px] text-neutral-500">{s.label}</div>
                </div>
              ))}
            </div>

            <span className="section-label">Wallet Addresses</span>
            <div className="space-y-2 mt-3">
              {selected.addresses.map(addr => (
                <div key={addr.address} className="flex items-center justify-between glass-card p-3">
                  <a
                    href={`https://solscan.io/account/${addr.address}`}
                    target="_blank"
                    rel="noopener"
                    className="font-mono text-[13px] text-neutral-400 hover:text-white truncate transition-colors"
                  >
                    {addr.address}
                  </a>
                  <div className="text-[11px] text-neutral-600 ml-4 whitespace-nowrap">
                    Since {addr.dateOfFirstTransaction}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="section-label">{selected.name} Transfers</span>
            <div className="mt-3">
              <TransferTable transfers={transfers} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
