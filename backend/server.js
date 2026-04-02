const fs = require('fs');
const dotenvPath = fs.existsSync('.env') ? '.env' : '../.env';
require('dotenv').config({ path: dotenvPath });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { startSyncJob, runSync } = require('./jobs/sync.job');

const app = express();
const PORT = process.env.PORT || 3088;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/facilitators', require('./routes/facilitators.routes'));
app.use('/api/transfers', require('./routes/transfers.routes'));
app.use('/api/servers', require('./routes/servers.routes'));
app.use('/api/resources', require('./routes/resources.routes'));
app.use('/api/discover', require('./routes/discover.routes'));
app.use('/api/stats', require('./routes/stats.routes'));

// Skill MD
app.get('/skill.md', (req, res) => {
  res.type('text/markdown').sendFile(path.join(__dirname, 'skill.md'));
});

// Manual sync trigger
app.post('/api/scan/trigger', async (req, res) => {
  try {
    console.log('[API] Manual scan triggered');
    const results = await runSync();
    res.json({ success: true, results });
  } catch (err) {
    console.error('[API] Manual scan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'orbitx402', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'OrbitX402',
    description: 'x402 Discovery Layer for Agents — Solana Network',
    version: '1.0.0',
    endpoints: {
      discover: 'POST /api/discover',
      servers: '/api/servers',
      'servers/register': 'POST /api/servers/register',
      'servers/detail': '/api/servers/detail?url=',
      resources: '/api/resources',
      facilitators: '/api/facilitators',
      transfers: '/api/transfers',
      stats: '/api/stats',
      skill: '/skill.md',
      scan: 'POST /api/scan/trigger',
      health: '/api/health',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n  OrbitX402 Backend running on http://localhost:${PORT}\n`);

  const interval = parseInt(process.env.SYNC_INTERVAL_MINUTES) || 30;
  startSyncJob(interval);
});
