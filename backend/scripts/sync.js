#!/usr/bin/env node

/**
 * OrbitX402 — Standalone sync script
 *
 * Runs the full data pipeline without starting the Express server:
 *   1. Scan USDC transfers from Solana RPC (facilitator wallets)
 *   2. Sync servers from x402scan.com
 *   3. Probe each server for x402 endpoints
 *   4. Update facilitator stats
 *
 * Usage:
 *   node scripts/sync.js                  # full sync
 *   node scripts/sync.js --transfers-only # just transfers
 *   node scripts/sync.js --servers-only   # just servers + endpoints
 *
 * Designed to run via GitHub Actions cron or manually.
 */

const path = require('path');
const fs = require('fs');

// Ensure we're in the backend directory for data file paths
process.chdir(path.join(__dirname, '..'));

const dotenvPath = fs.existsSync('.env') ? '.env' : '../.env';
require('dotenv').config({ path: dotenvPath });

const scannerService = require('../services/scanner.service');
const discoveryService = require('../services/discovery.service');
const dataService = require('../services/data.service');

const args = process.argv.slice(2);
const transfersOnly = args.includes('--transfers-only');
const serversOnly = args.includes('--servers-only');

async function main() {
  const startTime = Date.now();
  console.log(`\n=== OrbitX402 Sync — ${new Date().toISOString()} ===\n`);

  const results = {
    transfers: null,
    servers: null,
    resources: null,
    duration: 0,
  };

  // ── Phase 1: Scan transfers from Solana RPC ──
  if (!serversOnly) {
    try {
      console.log('[Sync] Phase 1: Scanning transfers from Solana RPC...');
      results.transfers = await scannerService.scan();
      console.log(`[Sync] Transfers: ${results.transfers.totalNew || 0} new\n`);
    } catch (err) {
      console.error('[Sync] Transfer scan failed:', err.message);
      results.transfers = { error: err.message };
    }
  }

  // ── Phase 2: Sync servers from x402scan ──
  if (!transfersOnly) {
    try {
      console.log('[Sync] Phase 2: Syncing servers from x402scan.com...');
      const servers = await discoveryService.syncServers();
      for (const server of servers) {
        await dataService.addOrUpdateServer(server);
      }
      results.servers = { synced: servers.length };
      console.log(`[Sync] Servers: ${servers.length} synced\n`);
    } catch (err) {
      console.error('[Sync] Server sync failed:', err.message);
      results.servers = { error: err.message };
    }

    // ── Phase 3: Probe server endpoints ──
    try {
      console.log('[Sync] Phase 3: Probing servers for endpoints...');
      const servers = dataService.getServersSync();
      let totalEndpoints = 0;

      for (const server of servers) {
        try {
          const endpoints = await discoveryService.probeServerResources(server.serverUrl);
          if (endpoints.length > 0) {
            await dataService.bulkAddResources(endpoints);
            server.resourceCount = endpoints.length;
            server.lastProbedAt = new Date().toISOString();
            await dataService.addOrUpdateServer(server);
            totalEndpoints += endpoints.length;
          }
          // Rate limit between servers
          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          // Skip failing servers silently
        }
      }

      results.resources = { probed: servers.length, endpoints: totalEndpoints };
      console.log(`[Sync] Resources: ${totalEndpoints} endpoints from ${servers.length} servers\n`);
    } catch (err) {
      console.error('[Sync] Endpoint probing failed:', err.message);
      results.resources = { error: err.message };
    }
  }

  // ── Summary ──
  results.duration = Math.round((Date.now() - startTime) / 1000);

  const facilitators = dataService.getFacilitatorsSync();
  const transfers = dataService.getTransfersSync();
  const servers = dataService.getServersSync();
  const resources = dataService.getResourcesSync();

  console.log('=== Summary ===');
  console.log(`  Facilitators: ${facilitators.length}`);
  console.log(`  Transfers:    ${transfers.length}`);
  console.log(`  Servers:      ${servers.length}`);
  console.log(`  Endpoints:    ${resources.length}`);
  console.log(`  Duration:     ${results.duration}s`);
  console.log(`  Timestamp:    ${new Date().toISOString()}`);
  console.log();

  // Write a sync log
  const syncLog = {
    timestamp: new Date().toISOString(),
    duration: results.duration,
    totals: {
      facilitators: facilitators.length,
      transfers: transfers.length,
      servers: servers.length,
      resources: resources.length,
    },
    results,
  };

  await dataService.write('sync-log', syncLog);
  console.log('[Sync] Done. Results written to data/sync-log.json');
}

main().catch(err => {
  console.error('[Sync] Fatal error:', err);
  process.exit(1);
});
