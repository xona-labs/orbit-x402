const cron = require('node-cron');
const scannerService = require('../services/scanner.service');
const discoveryService = require('../services/discovery.service');

let syncTask = null;

function startSyncJob(intervalMinutes = 30) {
  const cronExpr = `*/${intervalMinutes} * * * *`;
  console.log(`[SyncJob] Scheduling sync every ${intervalMinutes} minutes (${cronExpr})`);

  syncTask = cron.schedule(cronExpr, async () => {
    console.log(`[SyncJob] Starting scheduled sync at ${new Date().toISOString()}`);
    await runSync();
  });

  return syncTask;
}

async function runSync() {
  const results = { scan: null, discovery: null, cdn: null, timestamp: new Date().toISOString() };

  try {
    console.log('[SyncJob] Phase 1: Scanning transfers...');
    results.scan = await scannerService.scan();
  } catch (err) {
    console.error('[SyncJob] Scan failed:', err.message);
    results.scan = { error: err.message };
  }

  try {
    console.log('[SyncJob] Phase 2: Discovering servers & resources...');
    results.discovery = await discoveryService.runFullDiscovery({ probeEndpoints: true });
  } catch (err) {
    console.error('[SyncJob] Discovery failed:', err.message);
    results.discovery = { error: err.message };
  }

  // Phase 3: Upload to CDN if configured
  if (process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET) {
    try {
      console.log('[SyncJob] Phase 3: Uploading to CDN...');
      const { uploadToCDN } = require('../scripts/upload-cdn');
      await uploadToCDN();
      results.cdn = { success: true };
    } catch (err) {
      console.error('[SyncJob] CDN upload failed:', err.message);
      results.cdn = { error: err.message };
    }
  }

  console.log('[SyncJob] Sync complete.');
  return results;
}

function stopSyncJob() {
  if (syncTask) { syncTask.stop(); syncTask = null; }
}

module.exports = { startSyncJob, runSync, stopSyncJob };
