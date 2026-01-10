# JPDB Review Transcriber

A system for automatically capturing JPDB review answer pages and storing them with timestamps. Consists of a Node.js server and a userscript that runs in your browser.

## Server Installation

```bash
npm install
```

## Server Usage

Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The server runs on `http://localhost:3000` by default.

## Userscript Installation

1. Install a userscript manager for your browser:
   - Chrome/Edge: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/)
   - Firefox: [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
   - Safari: [Userscripts](https://apps.apple.com/app/userscripts/id1463298887)

2. Open `jpdb-review-transcriber.user.js` in your text editor and copy the contents

3. Click on your userscript manager icon in your browser toolbar and select "Create new script"

4. Paste the contents and save

5. Make sure the server is running before you visit JPDB review pages

## How It Works

When you review vocabulary on JPDB:
- The userscript automatically detects when you're viewing an answer page (URLs with `#a` hash)
- It extracts the vocabulary data: kanji/word, reading (furigana), and all meanings
- Sends the extracted data as JSON to your local server at `http://localhost:3000/save`
- The server stores it with a timestamp in `storage/entries.json`
- **If the server is not running**, a red warning banner appears at the top of the page

Example of extracted data:
```json
{
  "url": "https://jpdb.io/review?c=vf%2C1204780%2C1716467195&r=31#a",
  "word": "垣",
  "reading": "かき",
  "meanings": [
    "1.  fence;  hedge;  barrier;  wall;  railing"
  ]
}
```

The userscript logs activity to the browser console (F12) for debugging.

## API Endpoints

### POST /save

Save text content with a timestamp.

```bash
curl -X POST http://localhost:3000/save \
  -H "Content-Type: text/plain" \
  -d "Your text content here"
```

Or with HTML:

```bash
curl -X POST http://localhost:3000/save \
  -H "Content-Type: text/html" \
  -d "<html><body>Your HTML content</body></html>"
```

**Response:**
```json
{
  "success": true,
  "message": "Content saved successfully",
  "timestamp": "2025-12-04T10:11:30.123Z"
}
```

### GET /read?n=10

Retrieve the last N saved entries (default: 10).

```bash
curl http://localhost:3000/read?n=5
```

**Response:**
```json
{
  "count": 5,
  "total": 42,
  "entries": [
    {
      "timestamp": "2025-12-04T10:11:30.123Z",
      "content": "Your text content"
    }
  ]
}
```

### GET /today

Retrieve all entries saved today (JSON format).

```bash
curl http://localhost:3000/today
```

**Response:**
```json
{
  "date": "2025-12-04",
  "count": 12,
  "total": 42,
  "entries": [
    {
      "timestamp": "2025-12-04T10:11:30.123Z",
      "content": "{\"word\":\"垣\",\"reading\":\"かき\",\"meanings\":[...]}"
    }
  ]
}
```

### GET /today/text

Retrieve today's entries as plain text (one line per entry, no timestamps or URLs).

```bash
curl http://localhost:3000/today/text
```

**Response:**
```
垣 (かき): 1.  fence;  hedge;  barrier;  wall;  railing
垣 (かき): 1.  fence;  hedge;  barrier;  wall;  railing
あのね: 1.  look here;  I say;  well;  I know what;  I'll tell you what;  just a minute;  hold on
写生 (しゃせい): 1.  sketching;  drawing from nature;  portrayal;  description
```

### GET /today/text/unique

Retrieve today's entries as plain text with duplicates removed (if you reviewed the same word multiple times).

```bash
curl http://localhost:3000/today/text/unique
```

**Response:**
```
垣 (かき): 1.  fence;  hedge;  barrier;  wall;  railing
あのね: 1.  look here;  I say;  well;  I know what;  I'll tell you what;  just a minute;  hold on
写生 (しゃせい): 1.  sketching;  drawing from nature;  portrayal;  description
```

### GET /all

Retrieve all entries in the database.

```bash
curl http://localhost:3000/all
```

### DELETE /delete/:timestamp

Delete an entry by its timestamp.

```bash
curl -X DELETE http://localhost:3000/delete/2025-12-04T10:11:30.123Z
```

### GET /manage

Web UI to view and delete entries. Open in your browser:

```
http://localhost:3000/manage
```

## Storage

Data is stored in `storage/entries.json` as a JSON array with timestamps.
