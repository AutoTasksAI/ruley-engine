const https = require('https');
const http = require('http');
const crypto = require('crypto');
const url = require('url');
const pdfParse = require('pdf-parse');

const RAILWAY_URL = 'https://ruley-engine-production.up.railway.app';

const PDF_SOURCES = [
  {
    source: 'USAP Official Rulebook 2026',
    url: 'https://usapickleball.org/docs/rules/USAP-Official-Rulebook.pdf',
    version: '2026',
  },
  {
    source: 'USAP Referee Casebook',
    url: 'https://usapickleball.org/docs/referee/usa-pickleball-referee-casebook-2026-r1.pdf',
    version: '2026',
  },
  {
    source: 'USAP Annual Change Document',
    url: 'https://usapickleball.org/docs/rules/USAP-Rulebook-Change-Document.pdf',
    version: '2026',
  },
];

function fetchBuffer(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(
      {
        hostname: parsed.hostname,
        path: parsed.path,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RuleyEngine/1.0)' },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${targetUrl}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error(`Timeout: ${targetUrl}`)); });
  });
}

function postSeed(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = url.parse(`${RAILWAY_URL}/v1/seed`);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(JSON.parse(data)));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  for (const src of PDF_SOURCES) {
    try {
      console.log(`Fetching: ${src.source}`);
      const buffer = await fetchBuffer(src.url);
      console.log(`  Parsing PDF (${Math.round(buffer.length / 1024)}kb)...`);
      const parsed = await pdfParse(buffer);
      const content = parsed.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      const hash = crypto.createHash('md5').update(buffer).digest('hex');
      console.log(`  Seeding to Railway...`);
      const result = await postSeed({ source: src.source, url: src.url, content, hash, version: src.version });
      console.log(`  OK:`, result);
    } catch (err) {
      console.error(`  FAIL: ${src.source} — ${err.message}`);
    }
  }
  console.log('\nDone. Check /v1/documents to verify.');
}

run();
