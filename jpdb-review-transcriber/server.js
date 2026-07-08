const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.TRANSCRIBER_PORT || process.env.PORT || 3000;
const STORAGE_DIR = path.join(__dirname, 'storage');
const STORAGE_FILE = path.join(STORAGE_DIR, 'entries.json');

app.use(cors());
app.use(express.text({ limit: '10mb', type: '*/*' }));
app.use(express.json());

async function ensureStorageExists() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    try {
      await fs.access(STORAGE_FILE);
    } catch {
      await fs.writeFile(STORAGE_FILE, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error creating storage:', error);
  }
}

async function readEntries() {
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading entries:', error);
    return [];
  }
}

async function writeEntries(entries) {
  try {
    await fs.writeFile(STORAGE_FILE, JSON.stringify(entries, null, 2));
  } catch (error) {
    console.error('Error writing entries:', error);
    throw error;
  }
}

app.post('/save', async (req, res) => {
  try {
    const content = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }

    const entries = await readEntries();
    const newEntry = {
      timestamp: new Date().toISOString(),
      content: content
    };

    entries.push(newEntry);
    await writeEntries(entries);

    res.json({
      success: true,
      message: 'Content saved successfully',
      timestamp: newEntry.timestamp
    });
  } catch (error) {
    console.error('Error saving content:', error);
    res.status(500).json({ error: 'Failed to save content' });
  }
});

app.get('/read', async (req, res) => {
  try {
    const n = parseInt(req.query.n) || 10;

    if (n < 1) {
      return res.status(400).json({ error: 'Parameter n must be a positive number' });
    }

    const entries = await readEntries();
    const lastN = entries.slice(-n);

    res.json({
      count: lastN.length,
      total: entries.length,
      entries: lastN
    });
  } catch (error) {
    console.error('Error reading content:', error);
    res.status(500).json({ error: 'Failed to read content' });
  }
});

app.get('/today', async (req, res) => {
  try {
    const entries = await readEntries();

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Filter entries that match today's date
    const todayEntries = entries.filter(entry => {
      const entryDate = entry.timestamp.split('T')[0];
      return entryDate === today;
    });

    res.json({
      date: today,
      count: todayEntries.length,
      total: entries.length,
      entries: todayEntries
    });
  } catch (error) {
    console.error('Error reading today\'s content:', error);
    res.status(500).json({ error: 'Failed to read today\'s content' });
  }
});

app.get('/today/unique', async (req, res) => {
  try {
    const entries = await readEntries();

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Filter entries that match today's date
    const todayEntries = entries.filter(entry => {
      const entryDate = entry.timestamp.split('T')[0];
      return entryDate === today;
    });

    // Use a Set to track unique entries
    const seen = new Set();
    const uniqueEntries = [];

    todayEntries.forEach(entry => {
      try {
        const data = JSON.parse(entry.content);
        const word = data.word || '';
        const reading = data.reading || '';

        // Create a unique key based on word and reading
        const key = `${word}|${reading}`;

        if (!seen.has(key)) {
          seen.add(key);
          uniqueEntries.push(entry);
        }
      } catch {
        // If not JSON, use content as key
        const key = entry.content;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueEntries.push(entry);
        }
      }
    });

    res.json({
      date: today,
      count: uniqueEntries.length,
      total: entries.length,
      entries: uniqueEntries
    });
  } catch (error) {
    console.error('Error reading today\'s unique content:', error);
    res.status(500).json({ error: 'Failed to read today\'s unique content' });
  }
});

app.get('/today/text', async (req, res) => {
  try {
    const entries = await readEntries();

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Filter entries that match today's date
    const todayEntries = entries.filter(entry => {
      const entryDate = entry.timestamp.split('T')[0];
      return entryDate === today;
    });

    // Convert to plain text, one line per entry
    const lines = todayEntries.map(entry => {
      try {
        const data = JSON.parse(entry.content);
        const word = data.word || '';
        const reading = data.reading ? ` (${data.reading})` : '';

        // Format meanings object with grammar terms as keys
        const meanings = Object.entries(data.meanings || {})
          .map(([grammarTerm, defs]) => `[${grammarTerm}] ${defs.join('; ')}`)
          .join(' | ');

        return `${word}${reading}: ${meanings}`;
      } catch {
        // If not JSON, just return the content
        return entry.content;
      }
    });

    res.type('text/plain');
    res.send(lines.join('\n'));
  } catch (error) {
    console.error('Error reading today\'s content:', error);
    res.status(500).send('Error reading today\'s content');
  }
});

app.get('/today/text/unique', async (req, res) => {
  try {
    const entries = await readEntries();

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Filter entries that match today's date
    const todayEntries = entries.filter(entry => {
      const entryDate = entry.timestamp.split('T')[0];
      return entryDate === today;
    });

    // Use a Set to track unique entries
    const seen = new Set();
    const uniqueLines = [];

    todayEntries.forEach(entry => {
      try {
        const data = JSON.parse(entry.content);
        const word = data.word || '';
        const reading = data.reading ? ` (${data.reading})` : '';

        // Format meanings object with grammar terms as keys
        const meanings = Object.entries(data.meanings || {})
          .map(([grammarTerm, defs]) => `[${grammarTerm}] ${defs.join('; ')}`)
          .join(' | ');

        const line = `${word}${reading}: ${meanings}`;

        // Create a unique key based on word and reading
        const key = `${word}|${reading}`;

        if (!seen.has(key)) {
          seen.add(key);
          uniqueLines.push(line);
        }
      } catch {
        // If not JSON, just return the content
        const line = entry.content;
        if (!seen.has(line)) {
          seen.add(line);
          uniqueLines.push(line);
        }
      }
    });

    res.type('text/plain');
    res.send(uniqueLines.join('\n'));
  } catch (error) {
    console.error('Error reading today\'s content:', error);
    res.status(500).send('Error reading today\'s content');
  }
});

app.get('/all', async (req, res) => {
  try {
    const entries = await readEntries();
    res.json({
      count: entries.length,
      entries: entries
    });
  } catch (error) {
    console.error('Error reading all content:', error);
    res.status(500).json({ error: 'Failed to read all content' });
  }
});

app.delete('/delete/:timestamp', async (req, res) => {
  try {
    const timestamp = req.params.timestamp;
    const entries = await readEntries();

    const filteredEntries = entries.filter(entry => entry.timestamp !== timestamp);

    if (filteredEntries.length === entries.length) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await writeEntries(filteredEntries);

    res.json({
      success: true,
      message: 'Entry deleted successfully',
      timestamp: timestamp
    });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

app.delete('/delete/all', async (req, res) => {
  try {
    const entries = await readEntries();
    const count = entries.length;

    await writeEntries([]);

    res.json({
      success: true,
      message: 'All entries deleted successfully',
      deletedCount: count
    });
  } catch (error) {
    console.error('Error deleting all entries:', error);
    res.status(500).json({ error: 'Failed to delete all entries' });
  }
});

app.get('/manage', (req, res) => {
  res.sendFile(path.join(__dirname, 'manage.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.json({
    message: 'jpdb-review-transcriber server',
    endpoints: {
      'POST /save': 'Save text content (send raw text in body)',
      'GET /read?n=10': 'Read last n entries (default: 10)',
      'GET /today': 'Read all entries saved today (JSON)',
      'GET /today/unique': 'Read today\'s entries (JSON, deduplicated)',
      'GET /today/text': 'Read today\'s entries as plain text',
      'GET /today/text/unique': 'Read today\'s entries as plain text (deduplicated)',
      'GET /all': 'Read all entries',
      'DELETE /delete/:timestamp': 'Delete entry by timestamp',
      'DELETE /delete/all': 'Delete all entries',
      'GET /manage': 'Web UI to manage entries'
    }
  });
});

ensureStorageExists().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  \x1b[36m\x1b[1mREVIEW TRANSCRIBER\x1b[0m is running`);
    console.log(`  Server running on http://0.0.0.0:${PORT} (reachable on your LAN)`);
    console.log(`  Storage directory: ${STORAGE_DIR}\n`);
  });
});
