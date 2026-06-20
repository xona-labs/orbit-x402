/**
 * Report Service — generates comprehensive USDC activity reports for a wallet address.
 *
 * Fetches on-chain data via Solana RPC (server-side only — never exposed to callers).
 * Supports daily (1d), weekly (7d), and monthly (30d) periods.
 */

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_DECIMALS = 6;
const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 300;

const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 30 };

// Simple in-memory cache: key → { data, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

class ReportService {
  get _rpcUrl() {
    return process.env.SOLANA_RPC_URL || DEFAULT_RPC;
  }

  async _rpc(method, params) {
    const resp = await fetch(this._rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const json = await resp.json();
    if (json.error) throw new Error(`RPC ${method}: ${json.error.message || JSON.stringify(json.error)}`);
    return json.result;
  }

  async _getSignaturesSince(address, sinceTs) {
    const allSigs = [];
    let before = undefined;

    while (true) {
      const params = { limit: 100, commitment: 'finalized' };
      if (before) params.before = before;

      const results = await this._rpc('getSignaturesForAddress', [address, params]);
      if (!results || results.length === 0) break;

      let reachedPeriod = false;
      for (const r of results) {
        if (r.err !== null) continue;
        // blockTime is in seconds
        if (r.blockTime && r.blockTime * 1000 < sinceTs) {
          reachedPeriod = true;
          break;
        }
        allSigs.push({ signature: r.signature, blockTime: r.blockTime });
      }

      if (reachedPeriod || results.length < 100) break;
      before = results[results.length - 1].signature;
      await this._sleep(BATCH_DELAY_MS);
    }

    return allSigs;
  }

  async _parseTransaction(signature) {
    const tx = await this._rpc('getTransaction', [
      signature,
      { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
    ]);
    if (!tx || !tx.meta) return [];

    const accountKeys = tx.transaction.message.accountKeys.map(
      k => (typeof k === 'string' ? k : k.pubkey)
    );

    const tokenAccountOwners = {};
    const allBalances = [...(tx.meta.preTokenBalances || []), ...(tx.meta.postTokenBalances || [])];
    for (const bal of allBalances) {
      const tokenAccount = accountKeys[bal.accountIndex];
      if (bal.owner) tokenAccountOwners[tokenAccount] = bal.owner;
    }

    const allInstructions = [
      ...tx.transaction.message.instructions,
      ...(tx.meta.innerInstructions || []).flatMap(ii => ii.instructions),
    ];

    const transfers = [];
    for (const ix of allInstructions) {
      if (ix.program !== 'spl-token' || !ix.parsed) continue;
      const { type, info } = ix.parsed;

      if (type === 'transferChecked' && info.mint === USDC_MINT) {
        transfers.push({
          signature,
          blockTime: tx.blockTime,
          sender: tokenAccountOwners[info.source] || info.authority || info.source,
          receiver: tokenAccountOwners[info.destination] || info.destination,
          amount: info.tokenAmount?.uiAmount || 0,
        });
      } else if (type === 'transfer') {
        const isUsdc = allBalances.some(
          bal =>
            bal.mint === USDC_MINT &&
            (accountKeys[bal.accountIndex] === info.source ||
              accountKeys[bal.accountIndex] === info.destination)
        );
        if (isUsdc) {
          transfers.push({
            signature,
            blockTime: tx.blockTime,
            sender: tokenAccountOwners[info.source] || info.authority || info.source,
            receiver: tokenAccountOwners[info.destination] || info.destination,
            amount: parseInt(info.amount || '0') / Math.pow(10, USDC_DECIMALS),
          });
        }
      }
    }
    return transfers;
  }

  async generateReport(address, period = 'weekly', network = 'solana') {
    const cacheKey = `${address}:${period}:${network}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const days = PERIOD_DAYS[period] || 7;
    const now = Date.now();
    const sinceTs = now - days * 24 * 60 * 60 * 1000;

    // Fetch all signatures within the period
    const sigInfos = await this._getSignaturesSince(address, sinceTs);

    // Parse transactions in batches
    const transfers = [];
    for (let i = 0; i < sigInfos.length; i += BATCH_SIZE) {
      const batch = sigInfos.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(s =>
          this._parseTransaction(s.signature).catch(() => [])
        )
      );
      for (const txTransfers of results) {
        for (const t of txTransfers) {
          // Only include transfers where this address is sender or receiver
          if (t.sender !== address && t.receiver !== address) continue;
          transfers.push({
            ...t,
            direction: t.sender === address ? 'sent' : 'received',
          });
        }
      }
      if (i + BATCH_SIZE < sigInfos.length) await this._sleep(BATCH_DELAY_MS);
    }

    const sent = transfers.filter(t => t.direction === 'sent');
    const received = transfers.filter(t => t.direction === 'received');
    const totalSent = sent.reduce((s, t) => s + t.amount, 0);
    const totalReceived = received.reduce((s, t) => s + t.amount, 0);

    // Daily timeline buckets
    const timeline = this._buildTimeline(transfers, days, sinceTs);

    // Top counterparties by volume
    const cpMap = {};
    for (const t of transfers) {
      const cp = t.direction === 'sent' ? t.receiver : t.sender;
      if (!cp) continue;
      if (!cpMap[cp]) cpMap[cp] = { address: cp, sent: 0, received: 0, txCount: 0 };
      if (t.direction === 'sent') cpMap[cp].sent += t.amount;
      else cpMap[cp].received += t.amount;
      cpMap[cp].txCount++;
    }
    const topCounterparties = Object.values(cpMap)
      .map(cp => ({
        ...cp,
        sent: parseFloat(cp.sent.toFixed(6)),
        received: parseFloat(cp.received.toFixed(6)),
        totalVolume: parseFloat((cp.sent + cp.received).toFixed(6)),
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 10);

    // Top transactions by amount
    const topTransactions = [...transfers]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(t => ({
        txHash: t.signature,
        direction: t.direction,
        amount: parseFloat(t.amount.toFixed(6)),
        counterparty: t.direction === 'sent' ? t.receiver : t.sender,
        timestamp: t.blockTime ? new Date(t.blockTime * 1000).toISOString() : null,
      }));

    const data = {
      address,
      network,
      period,
      periodStart: new Date(sinceTs).toISOString(),
      periodEnd: new Date(now).toISOString(),
      summary: {
        totalSent: parseFloat(totalSent.toFixed(6)),
        totalReceived: parseFloat(totalReceived.toFixed(6)),
        netFlow: parseFloat((totalReceived - totalSent).toFixed(6)),
        txCount: transfers.length,
        asset: 'USDC',
      },
      timeline,
      topCounterparties,
      topTransactions,
    };

    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }

  _buildTimeline(transfers, days, sinceTs) {
    const buckets = {};
    for (let d = 0; d < days; d++) {
      const date = new Date(sinceTs + d * 24 * 60 * 60 * 1000);
      const key = date.toISOString().slice(0, 10);
      buckets[key] = { date: key, sent: 0, received: 0, txCount: 0 };
    }

    for (const t of transfers) {
      if (!t.blockTime) continue;
      const key = new Date(t.blockTime * 1000).toISOString().slice(0, 10);
      if (!buckets[key]) continue;
      if (t.direction === 'sent') buckets[key].sent += t.amount;
      else buckets[key].received += t.amount;
      buckets[key].txCount++;
    }

    return Object.values(buckets).map(b => ({
      date: b.date,
      sent: parseFloat(b.sent.toFixed(6)),
      received: parseFloat(b.received.toFixed(6)),
      txCount: b.txCount,
    }));
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ReportService();
