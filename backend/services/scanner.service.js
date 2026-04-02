const dataService = require('./data.service');

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_DECIMALS = 6;
const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 300;
const MAX_SIGNATURES_PER_SCAN = 500;

class ScannerService {
  constructor() {
    this._scanning = false;
  }

  get _rpcUrl() {
    return process.env.SOLANA_RPC_URL || DEFAULT_RPC;
  }

  // --- Solana RPC helpers ---

  async _rpc(method, params) {
    const resp = await fetch(this._rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });

    const json = await resp.json();
    if (json.error) {
      throw new Error(`RPC ${method}: ${json.error.message || JSON.stringify(json.error)}`);
    }
    return json.result;
  }

  /**
   * Fetch transaction signatures for an address with pagination.
   * Returns newest-first. Uses `until` to skip already-synced signatures.
   */
  async _getSignatures(address, opts = {}) {
    const allSigs = [];
    let before = undefined;
    const limit = Math.min(opts.maxSignatures || MAX_SIGNATURES_PER_SCAN, 1000);

    while (allSigs.length < (opts.maxSignatures || MAX_SIGNATURES_PER_SCAN)) {
      const params = { limit: Math.min(limit, 1000), commitment: 'finalized' };
      if (before) params.before = before;
      if (opts.untilSignature) params.until = opts.untilSignature;

      const results = await this._rpc('getSignaturesForAddress', [address, params]);

      if (!results || results.length === 0) break;

      for (const r of results) {
        if (r.err === null) {
          allSigs.push({
            signature: r.signature,
            blockTime: r.blockTime,
            slot: r.slot,
          });
        }
      }

      if (results.length < 1000) break;
      before = results[results.length - 1].signature;

      // Rate limit
      await this._sleep(BATCH_DELAY_MS);
    }

    return allSigs;
  }

  /**
   * Parse a single transaction for USDC SPL token transfers.
   * Handles both `transfer` and `transferChecked` instruction types.
   */
  async _parseTransaction(signature) {
    const tx = await this._rpc('getTransaction', [
      signature,
      { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
    ]);

    if (!tx || !tx.meta) return [];

    const transfers = [];
    const accountKeys = tx.transaction.message.accountKeys.map(
      k => (typeof k === 'string' ? k : k.pubkey)
    );

    // Build map: token account address -> owner wallet address
    const tokenAccountOwners = {};
    const allBalances = [...(tx.meta.preTokenBalances || []), ...(tx.meta.postTokenBalances || [])];

    for (const bal of allBalances) {
      const tokenAccount = accountKeys[bal.accountIndex];
      if (bal.owner) {
        tokenAccountOwners[tokenAccount] = bal.owner;
      }
    }

    // Collect all instructions (top-level + inner)
    const allInstructions = [
      ...tx.transaction.message.instructions,
      ...(tx.meta.innerInstructions || []).flatMap(ii => ii.instructions),
    ];

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
          amountRaw: parseInt(info.tokenAmount?.amount || '0'),
          slot: tx.slot,
        });
      } else if (type === 'transfer' && info.source && info.destination) {
        // Basic transfer — no mint field, verify via token balances
        const isUsdc = allBalances.some(
          bal =>
            bal.mint === USDC_MINT &&
            (accountKeys[bal.accountIndex] === info.source ||
              accountKeys[bal.accountIndex] === info.destination)
        );

        if (isUsdc) {
          const rawAmount = parseInt(info.amount || '0');
          transfers.push({
            signature,
            blockTime: tx.blockTime,
            sender: tokenAccountOwners[info.source] || info.authority || info.source,
            receiver: tokenAccountOwners[info.destination] || info.destination,
            amount: rawAmount / Math.pow(10, USDC_DECIMALS),
            amountRaw: rawAmount,
            slot: tx.slot,
          });
        }
      }
    }

    return transfers;
  }

  /**
   * Scan all USDC transfers for a facilitator address.
   * Determines direction (sent/received) based on whether the facilitator is sender or receiver.
   */
  async _scanAddress(facilitatorId, address, lastSignature) {
    console.log(`[Scanner] Fetching signatures for ${address.slice(0, 8)}...`);

    const sigInfos = await this._getSignatures(address, {
      maxSignatures: MAX_SIGNATURES_PER_SCAN,
      untilSignature: lastSignature || undefined,
    });

    if (sigInfos.length === 0) {
      console.log(`[Scanner] No new signatures for ${address.slice(0, 8)}...`);
      return [];
    }

    console.log(`[Scanner] Found ${sigInfos.length} signatures, parsing transactions...`);

    const allTransfers = [];

    // Process in batches to respect rate limits
    for (let i = 0; i < sigInfos.length; i += BATCH_SIZE) {
      const batch = sigInfos.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(s => this._parseTransaction(s.signature).catch(err => {
          console.error(`[Scanner] Failed to parse ${s.signature.slice(0, 8)}...:`, err.message);
          return [];
        }))
      );

      for (const txTransfers of batchResults) {
        for (const t of txTransfers) {
          // Determine direction relative to the facilitator
          const direction = t.sender === address ? 'sent' : 'received';

          allTransfers.push({
            txHash: t.signature,
            facilitatorId,
            facilitatorAddress: address,
            direction,
            sender: t.sender,
            receiver: t.receiver,
            amount: t.amount,
            amountRaw: t.amountRaw,
            asset: 'USDC',
            network: 'solana',
            blockHeight: t.slot,
            blockTimestamp: t.blockTime ? new Date(t.blockTime * 1000).toISOString() : null,
          });
        }
      }

      // Rate limit between batches
      if (i + BATCH_SIZE < sigInfos.length) {
        await this._sleep(BATCH_DELAY_MS);
      }
    }

    return allTransfers;
  }

  // --- Main scan ---

  async scan() {
    if (this._scanning) {
      console.log('[Scanner] Scan already in progress, skipping');
      return { skipped: true };
    }

    this._scanning = true;
    const results = { facilitators: {}, totalNew: 0, errors: [] };

    try {
      const facilitators = dataService.getFacilitatorsSync();

      console.log(`[Scanner] Starting scan across ${facilitators.length} facilitators using Solana RPC`);
      console.log(`[Scanner] RPC: ${this._rpcUrl}`);

      for (const facilitator of facilitators) {
        let facilitatorNew = 0;

        for (const addrConfig of facilitator.addresses) {
          try {
            console.log(`[Scanner] Scanning ${facilitator.name} / ${addrConfig.address.slice(0, 8)}...`);

            const transfers = await this._scanAddress(
              facilitator.id,
              addrConfig.address,
              addrConfig.lastSignature || null
            );

            if (transfers.length > 0) {
              const added = await dataService.addTransfers(transfers);
              facilitatorNew += added;

              // Save the newest signature for incremental sync
              const newestSig = transfers[0]?.txHash;
              if (newestSig) {
                await dataService.updateFacilitatorAddressSync(
                  facilitator.id,
                  addrConfig.address,
                  new Date().toISOString(),
                  newestSig
                );
              }

              console.log(`[Scanner] ${facilitator.name}: ${transfers.length} parsed, ${added} new`);
            } else {
              // Update sync time even if no new transfers
              await dataService.updateFacilitatorAddressSync(
                facilitator.id,
                addrConfig.address,
                new Date().toISOString(),
                addrConfig.lastSignature || null
              );
            }
          } catch (err) {
            const errorMsg = `${facilitator.name}/${addrConfig.address.slice(0, 8)}: ${err.message}`;
            console.error(`[Scanner] Error:`, errorMsg);
            results.errors.push(errorMsg);
          }
        }

        // Recompute facilitator stats from all transfers
        const allTransfers = dataService.getTransfersSync();
        const facTransfers = allTransfers.filter(t => t.facilitatorId === facilitator.id);
        const counterparties = new Set();
        facTransfers.forEach(t => {
          const cp = t.direction === 'sent' ? t.receiver : t.sender;
          if (cp) counterparties.add(cp);
        });

        await dataService.updateFacilitatorStats(facilitator.id, {
          totalTransactions: facTransfers.length,
          totalVolume: parseFloat(facTransfers.reduce((sum, t) => sum + t.amount, 0).toFixed(2)),
          uniqueCounterparties: counterparties.size,
          lastActivityAt: facTransfers[0]?.blockTimestamp || null,
        });

        results.facilitators[facilitator.id] = { new: facilitatorNew, total: facTransfers.length };
        results.totalNew += facilitatorNew;
      }
    } finally {
      this._scanning = false;
    }

    console.log(`[Scanner] Scan complete. ${results.totalNew} new transfers.`);
    return results;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ScannerService();
