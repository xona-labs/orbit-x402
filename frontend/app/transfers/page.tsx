'use client';

import { useEffect, useState } from 'react';
import { getTransfers, getFacilitators } from '@/lib/api';
import type { Transfer, Facilitator } from '@/lib/api';
import TransferTable from '@/components/TransferTable';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (page = 1) => {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '50' };
      if (filter) params.facilitator = filter;

      const [tData, fData] = await Promise.all([
        getTransfers(params),
        facilitators.length ? Promise.resolve({ facilitators }) : getFacilitators(),
      ]);

      setTransfers(tData.transfers || []);
      setPagination(tData.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
      if (!facilitators.length) setFacilitators(fData.facilitators || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [filter]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Transactions</h1>
        <p className="text-neutral-500 text-sm">USDC transactions through x402 facilitators on Solana</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('')}
          className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
            !filter
              ? 'bg-white text-black'
              : 'bg-white/[0.04] text-neutral-400 hover:text-white border border-white/[0.06]'
          }`}
        >
          All
        </button>
        {facilitators.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${
              filter === f.id
                ? 'text-white'
                : 'bg-white/[0.04] text-neutral-400 hover:text-white border border-white/[0.06]'
            }`}
            style={filter === f.id ? { backgroundColor: f.color } : {}}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} />
            {f.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-6 h-6 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <TransferTable
          transfers={transfers}
          showPagination
          pagination={pagination}
          onPageChange={(page) => load(page)}
        />
      )}
    </div>
  );
}
