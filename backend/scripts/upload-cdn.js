#!/usr/bin/env node

/**
 * Upload JSON data files to DigitalOcean Spaces CDN.
 *
 * Usage:
 *   node scripts/upload-cdn.js
 *
 * Env vars:
 *   DO_SPACES_KEY       — Access key
 *   DO_SPACES_SECRET    — Secret key
 *   DO_SPACES_BUCKET    — Bucket name (default: provey-media)
 *   DO_SPACES_REGION    — Region (default: sgp1)
 *   DO_SPACES_PREFIX    — Key prefix (default: x402-data)
 */

const fs = require('fs');
const dotenvPath = fs.existsSync(require('path').join(__dirname, '..', '.env'))
  ? require('path').join(__dirname, '..', '.env')
  : require('path').join(__dirname, '..', '..', '.env');
require('dotenv').config({ path: dotenvPath });

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const BUCKET = process.env.DO_SPACES_BUCKET || 'provey-media';
const REGION = process.env.DO_SPACES_REGION || 'sgp1';
const PREFIX = process.env.DO_SPACES_PREFIX || 'x402-data';
const DATA_DIR = path.join(__dirname, '..', 'data');

const DATA_FILES = [
  'facilitators.json',
  'transfers.json',
  'servers.json',
  'resources.json',
  'sync-log.json',
];

const client = new S3Client({
  endpoint: `https://${REGION}.digitaloceanspaces.com`,
  region: REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || '',
  },
  forcePathStyle: false,
});

async function uploadToCDN() {
  if (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
    throw new Error('Missing DO_SPACES_KEY or DO_SPACES_SECRET');
  }

  console.log(`[Upload] Uploading to ${BUCKET}.${REGION}.cdn.digitaloceanspaces.com/${PREFIX}/\n`);

  for (const file of DATA_FILES) {
    const filePath = path.join(DATA_DIR, file);

    if (!fs.existsSync(filePath)) {
      console.log(`  Skip: ${file} (not found)`);
      continue;
    }

    const body = fs.readFileSync(filePath);
    const key = `${PREFIX}/${file}`;

    try {
      await client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: 'application/json',
        ACL: 'public-read',
        CacheControl: 'public, max-age=300', // 5 min cache
      }));

      const size = (body.length / 1024).toFixed(1);
      console.log(`  OK: ${file} (${size} KB)`);
    } catch (err) {
      console.error(`  FAIL: ${file} — ${err.message}`);
    }
  }

  console.log(`\n[Upload] Done. CDN URL: https://${BUCKET}.${REGION}.cdn.digitaloceanspaces.com/${PREFIX}/`);
}

module.exports = { uploadToCDN };

// Run directly: node scripts/upload-cdn.js
if (require.main === module) {
  uploadToCDN().catch(err => {
    console.error('[Upload] Fatal:', err.message);
    process.exit(1);
  });
}
