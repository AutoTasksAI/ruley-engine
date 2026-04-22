const cron = require('node-cron');
const { PDF_SOURCES, fetchPdfBuffer } = require('./fetcher');
const { HTML_SOURCES, scrapeHtml } = require('./scraper');
const { parsePdf } = require('./parser');
const { upsertDocument } = require('./storage');

async function ingestAll() {
  console.log(`[${new Date().toISOString()}] Starting ingestion...`);
  let success = 0;
  let failed = 0;

  for (const source of PDF_SOURCES) {
    try {
      const fetched = await fetchPdfBuffer(source);
      const content = await parsePdf(fetched.buffer);
      upsertDocument({
        source: fetched.source,
        url: fetched.url,
        content,
        hash: fetched.hash,
        version: fetched.version,
      });
      console.log(`  OK: ${source.source}`);
      success++;
    } catch (err) {
      console.error(`  FAIL: ${source.source} — ${err.message}`);
      failed++;
    }
  }

  for (const source of HTML_SOURCES) {
    try {
      const scraped = await scrapeHtml(source);
      upsertDocument({
        source: scraped.source,
        url: scraped.url,
        content: scraped.content,
        hash: scraped.hash,
        version: scraped.version,
      });
      console.log(`  OK: ${source.source}`);
      success++;
    } catch (err) {
      console.error(`  FAIL: ${source.source} — ${err.message}`);
      failed++;
    }
  }

  console.log(`[${new Date().toISOString()}] Ingestion complete. ${success} succeeded, ${failed} failed.`);
}

function startScheduler() {
  ingestAll().catch((err) => console.error('Startup ingestion error:', err));
  cron.schedule('0 3 * * *', () => {
    ingestAll().catch((err) => console.error('Scheduled ingestion error:', err));
  });
  console.log('Scheduler started — daily ingestion at 03:00');
}

module.exports = { startScheduler, runNow: ingestAll };
