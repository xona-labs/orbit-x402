/**
 * GET /api/report
 *
 * Generates a comprehensive USDC activity report for a wallet address.
 * Fetches on-chain data via Solana RPC server-side — never exposed to callers.
 *
 * Query params:
 *   address  (required) — wallet address (Solana base58)
 *   period   (optional) — daily | weekly | monthly  (default: weekly)
 *   network  (optional) — solana | ...              (default: solana, others reserved)
 */

const express = require('express');
const reportService = require('../services/report.service');

const router = express.Router();

const VALID_PERIODS = new Set(['daily', 'weekly', 'monthly']);

router.get('/', async (req, res) => {
  const { address, period = 'weekly', network = 'solana' } = req.query;

  if (!address || typeof address !== 'string' || address.trim() === '') {
    return res.status(400).json({ error: '`address` query parameter is required.' });
  }

  if (!VALID_PERIODS.has(period)) {
    return res.status(400).json({ error: '`period` must be daily, weekly, or monthly.' });
  }

  try {
    const report = await reportService.generateReport(address.trim(), period, network || 'solana');
    res.json(report);
  } catch (err) {
    console.error('[Report] Error generating report:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
