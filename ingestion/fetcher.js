const https = require('https');
const http = require('http');
const crypto = require('crypto');
const url = require('url');

const PDF_SOURCES = [
  {
    source: 'USAP Official Rulebook 2026',
    url: 'https://usapickleball.org/docs/rules/USAP-Official-Rulebook.pdf',
    type: 'pdf',
    version: '2026',
  },
  {
    source: 'USAP Referee Casebook',
    url: 'https://usapickleball.org/docs/referee/usa-pickleball-referee-casebook-2026-r1.pdf',
    type: 'pdf',
    version: '2026',
  },
  {
    source: 'USAP Annual Change Document',
    url: 'https://usapickleball.org/docs/rules/USAP-Rulebook-Change-Document.pdf',
    type: 'pdf',
    version: '2026',
  },
];

function md5(data) {
  return crypto.createHash('md5').update(data).digest('hex');
}

function fetchBuffer(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.get(
      {
        hostname: parsed.hostname,
        path: parsed.path,
        headers: {
          'User-Agent': 'RuleyEngine/1.0 (rules research bot; contact ruley.ai)',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${targetUrl}`));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${targetUrl}`));
    });
  });
}

async function fetchPdfBuffer(source) {
  console.log(`Fetching PDF: ${source.source}`);
  const buffer = await fetchBuffer(source.url);
  const hash = md5(buffer);
  return { ...source, buffer, hash };
}

module.exports = { PDF_SOURCES, fetchPdfBuffer, fetchBuffer, md5 };
