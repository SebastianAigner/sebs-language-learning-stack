#!/usr/bin/env node

// Simple HTTP server for the vocabulary trainer
// No dependencies - uses only Node.js built-in modules

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.WORD_PRODUCTION_PORT || process.env.PORT || 8080;

// MIME types for common file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Parse URL and remove query string
  let filePath = req.url.split('?')[0];

  // Default to index.html
  if (filePath === '/') {
    filePath = '/index.html';
  }

  // Construct full file path
  const fullPath = path.join(__dirname, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Read and serve the file
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      }
      return;
    }

    // Determine content type
    const ext = path.extname(fullPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('┌────────────────────────────────────────────────┐');
  console.log('│  Japanese Vocabulary Trainer - Server Running │');
  console.log('└────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log('');
  console.log('  Press Ctrl+C to stop the server');
  console.log('');
});
