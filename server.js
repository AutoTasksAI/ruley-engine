require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./api/routes');
const { initDb } = require('./ingestion/storage');
const { startScheduler } = require('./ingestion/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/v1', routes);
app.get('/compare', (req, res) => res.sendFile(path.join(__dirname, 'ruley-compare.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'ruley-chat.html')));

async function start() {
  await initDb();
  startScheduler();
  app.listen(PORT, () => {
    console.log(`Ruley Engine running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
