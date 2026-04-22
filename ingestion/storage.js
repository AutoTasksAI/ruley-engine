const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'ruley.db');

let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      hash TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      version TEXT
    );

    CREATE TABLE IF NOT EXISTS queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      model_used TEXT NOT NULL,
      confidence TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS changelog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      url TEXT NOT NULL,
      old_hash TEXT,
      new_hash TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      reviewed INTEGER DEFAULT 0
    );
  `);

  saveDb();
  console.log('Database initialized at', DB_PATH);
}

function getDb() {
  if (!db) throw new Error('DB not initialized — await initDb() first');
  return db;
}

function queryAll(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function upsertDocument({ source, url, content, hash, version }) {
  const now = new Date().toISOString();
  const existing = queryOne('SELECT hash FROM documents WHERE url = ?', [url]);

  if (existing && existing.hash !== hash) {
    getDb().run(
      'INSERT INTO changelog (source, url, old_hash, new_hash, detected_at) VALUES (?, ?, ?, ?, ?)',
      [source, url, existing.hash, hash, now]
    );
  }

  if (existing) {
    getDb().run(
      'UPDATE documents SET source=?, content=?, hash=?, fetched_at=?, version=? WHERE url=?',
      [source, content, hash, now, version || null, url]
    );
  } else {
    getDb().run(
      'INSERT INTO documents (source, url, content, hash, fetched_at, version) VALUES (?, ?, ?, ?, ?, ?)',
      [source, url, content, hash, now, version || null]
    );
  }

  saveDb();
}

function getAllDocuments() {
  return queryAll('SELECT id, source, url, hash, fetched_at, version FROM documents ORDER BY source');
}

function getAllDocumentContent() {
  return queryAll('SELECT source, url, content, version, fetched_at FROM documents ORDER BY source');
}

function logQuery({ question, answer, model_used, confidence }) {
  const now = new Date().toISOString();
  getDb().run(
    'INSERT INTO queries (question, answer, model_used, confidence, created_at) VALUES (?, ?, ?, ?, ?)',
    [question, JSON.stringify(answer), model_used, confidence, now]
  );
  saveDb();
}

function getChangelog(limit = 50) {
  return queryAll('SELECT * FROM changelog ORDER BY detected_at DESC LIMIT ?', [limit]);
}

module.exports = { initDb, upsertDocument, getAllDocuments, getAllDocumentContent, logQuery, getChangelog };
