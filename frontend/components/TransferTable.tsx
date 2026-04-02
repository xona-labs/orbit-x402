'use client';

import type { Transfer } from '@/lib/api';

interface TransferTableProps {
  transfers: Transfer[];
  showPagination?: boolean;
  pagination?: { page: number; limit: number; total: number; pages: number };
  onPageChange?: (page: number) => void;
}

const FACILITATOR_COLORS: Record<string, string> = {
  payai: '#9F3EC9',
  dexter: '#DD903A',
  relai: '#8B5CF6',
};

const FACILITATOR_NAMES: Record<string, string> = {
  payai: 'PayAI',
  dexter: 'Dexter',
  relai: 'Relai',
};

function shortenAddress(addr: string) {
  if (!addr) return '--';
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}

function formatDate(ts: string) {
  if (!ts) return '--';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function TransferTable({ transfers, showPagination, pagination, onPageChange }: TransferTableProps) {
  if (!transfers || transfers.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-neutral-500 text-sm">
        No transfers found. Hit Sync to fetch data from Solana.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="px-4 py-3 text-left text-[11px] text-neutral-500 uppercase tracking-wider font-medium">Facilitator</th>
              <th className="px-4 py-3 text-left text-[11px] text-neutral-500 uppercase tracking-wider font-medium">Dir</th>
              <th className="px-4 py-3 text-left text-[11px] text-neutral-500 uppercase tracking-wider font-medium">From</th>
              <th className="px-4 py-3 text-left text-[11px] text-neutral-500 uppercase tracking-wider font-medium">To</th>
              <th className="px-4 py-3 text-right text-[11px] text-neutral-500 uppercase tracking-wider font-medium">Amount</th>
              <th className="px-4 py-3 text-right text-[11px] text-neutral-500 uppercase tracking-wider font-medium">Time</th>
              <th className="px-4 py-3 text-center text-[11px] text-neutral-500 uppercase tracking-wider font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t, i) => (
              <tr
                key={t.txHash + i}
                className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: FACILITATOR_COLORS[t.facilitatorId] || '#555' }}
                    />
                    <span className="text-neutral-300 text-[13px]">{FACILITATOR_NAMES[t.facilitatorId] || t.facilitatorId}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                    t.direction === 'sent'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {t.direction === 'sent' ? 'OUT' : 'IN'}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-neutral-500">{shortenAddress(t.sender)}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-neutral-500">{shortenAddress(t.receiver)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-[13px] text-white">
                  ${t.amount.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right text-[12px] text-neutral-500">{formatDate(t.blockTimestamp)}</td>
                <td className="px-4 py-2.5 text-center">
                  <a
                    href={`https://solscan.io/tx/${t.txHash}`}
                    target="_blank"
                    rel="noopener"
                    className="text-neutral-500 hover:text-white text-[12px] transition-colors"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
          <span className="text-[12px] text-neutral-500">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-[12px] rounded-lg bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1 text-[12px] rounded-lg bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
