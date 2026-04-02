const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');

router.get('/', async (req, res) => {
  const { period } = req.query; // '24h', '7d', '30d', or empty for all-time

  const [facilitators, allTransfers, servers, resources] = await Promise.all([
    dataService.getFacilitators(),
    dataService.getTransfers(),
    dataService.getServers(),
    dataService.getResources(),
  ]);

  // Filter transfers by period
  let transfers = allTransfers;
  let periodLabel = 'All Time';

  if (period) {
    const now = Date.now();
    let cutoff = 0;
    if (period === '24h') { cutoff = now - 24 * 60 * 60 * 1000; periodLabel = '24 Hours'; }
    else if (period === '7d') { cutoff = now - 7 * 24 * 60 * 60 * 1000; periodLabel = '7 Days'; }
    else if (period === '30d') { cutoff = now - 30 * 24 * 60 * 60 * 1000; periodLabel = '30 Days'; }

    if (cutoff > 0) {
      transfers = allTransfers.filter(t => new Date(t.blockTimestamp).getTime() >= cutoff);
    }
  }

  const totalVolume = transfers.reduce((sum, t) => sum + t.amount, 0);
  const uniqueSenders = new Set(transfers.map(t => t.sender)).size;
  const uniqueReceivers = new Set(transfers.map(t => t.receiver)).size;

  // Daily volume for chart (always last 30 days from all transfers)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailyVolume = {};
  allTransfers
    .filter(t => new Date(t.blockTimestamp) >= thirtyDaysAgo)
    .forEach(t => {
      const day = t.blockTimestamp?.split('T')[0];
      if (day) dailyVolume[day] = (dailyVolume[day] || 0) + t.amount;
    });

  const volumeByFacilitator = {};
  facilitators.forEach(f => {
    // Recompute per facilitator for the period
    const facTransfers = transfers.filter(t => t.facilitatorId === f.id);
    volumeByFacilitator[f.id] = {
      name: f.name, color: f.color,
      volume: parseFloat(facTransfers.reduce((s, t) => s + t.amount, 0).toFixed(2)),
      transactions: facTransfers.length,
    };
  });

  res.json({
    period: period || 'all',
    periodLabel,
    overview: {
      totalFacilitators: facilitators.length,
      totalTransactions: transfers.length,
      totalVolume: parseFloat(totalVolume.toFixed(2)),
      totalServers: servers.length,
      totalResources: resources.length,
      uniqueParticipants: uniqueSenders + uniqueReceivers,
      network: 'solana', asset: 'USDC',
    },
    allTime: {
      totalTransactions: allTransfers.length,
      totalVolume: parseFloat(allTransfers.reduce((s, t) => s + t.amount, 0).toFixed(2)),
    },
    dailyVolume,
    volumeByFacilitator,
    lastUpdated: allTransfers[0]?.blockTimestamp || null,
  });
});

module.exports = router;
