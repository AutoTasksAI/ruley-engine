const express = require('express');
const { runQuery } = require('../engine/query');
const { getAllDocuments, getChangelog } = require('../ingestion/storage');
const { runNow } = require('../ingestion/scheduler');

const router = express.Router();

router.post('/query', async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  try {
    const answer = await runQuery(question.trim());
    res.json(answer);
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/documents', (req, res) => {
  try {
    const docs = getAllDocuments();
    res.json({ count: docs.length, documents: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/changelog', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const changes = getChangelog(limit);
    res.json({ count: changes.length, changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

router.post('/ingest', async (req, res) => {
  res.json({ status: 'ingestion started' });
  runNow().catch((err) => console.error('Manual ingestion error:', err));
});

router.post('/seed', (req, res) => {
  const { source, url, content, hash, version } = req.body;
  if (!source || !url || !content || !hash) {
    return res.status(400).json({ error: 'source, url, content, and hash are required' });
  }
  try {
    const { upsertDocument } = require('../ingestion/storage');
    upsertDocument({ source, url, content, hash, version: version || null });
    res.json({ status: 'ok', source });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
