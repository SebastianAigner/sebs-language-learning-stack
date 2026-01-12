# Japanese TTS Service

Microservice for generating Japanese text-to-speech using ElevenLabs API with intelligent file system caching.

## Features

- **ElevenLabs Flash v2.5 Model** - Fast, high-quality Japanese TTS
- **File System Caching** - SHA-256 hashed filenames prevent duplicate API calls
- **Management UI** - Web dashboard for monitoring and testing
- **REST API** - Simple HTTP endpoints for TTS generation and cache management
- **CORS Enabled** - Works seamlessly with frontend on localhost

## Prerequisites

- Node.js 18+ (for native fetch and --watch support)
- ElevenLabs API key ([get one here](https://elevenlabs.io))
- Port 5065 available

## Setup

1. **Configure Environment**:
   This service uses the centralized `.env` file in the project root. Ensure `ELEVENLABS_API_KEY` and/or `AZURE_API_KEY` are set there.

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the service**:
   ```bash
   npm run dev
   ```

The service will start on http://localhost:5065

## API Endpoints

### GET /
Serves the management UI dashboard.

### GET /tts?text={japanese_text}&previous_text={context}
Generate or serve cached TTS audio.

**Parameters:**
- `text` (required) - Japanese text to convert to speech (max 500 characters)
- `previous_text` (optional) - Previous text context to improve TTS naturalness (e.g. preceding sentence). For Azure AI, this is prepended at volume "silent" to provide context without being audible.

**Response:**
- Success (200): MP3 audio stream
- Error (400): Missing or invalid text
- Error (500): TTS generation failed

**Headers:**
- `Content-Type: audio/mpeg`
- `Cache-Control: public, max-age=31536000`
- `X-Cache-Status: HIT | MISS`

**Example:**
```bash
curl "http://localhost:5065/tts?text=食べる" --output audio.mp3
open audio.mp3
```

### GET /api/cache
Get cache statistics and list of all cached files.

**Response:**
```json
{
  "totalFiles": 42,
  "totalSize": 1234567,
  "files": [
    {
      "hash": "a1b2c3...",
      "text": "食べる",
      "size": 12345,
      "created": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/cache/clear
Clear all cached files (requires confirmation in UI).

**Response:**
```json
{
  "success": true,
  "deleted": 42
}
```

### DELETE /api/cache/:hash
Delete a specific cached file by its hash.

**Response:**
```json
{
  "success": true
}
```

### POST /api/test
Test TTS generation with sample text.

**Request Body:**
```json
{
  "text": "食べる"
}
```

**Response:**
```json
{
  "success": true,
  "cached": false,
  "hash": "a1b2c3...",
  "url": "/tts?text=食べる"
}
```

## Configuration

The service can be configured via environment variables:

```bash
PORT=5065                              # Server port (default: 5065)
VOICE_ID=3JDquces8E8bkmvbh6Bc          # ElevenLabs voice ID
MODEL=eleven_flash_v2_5                # ElevenLabs model
```

Default configuration (in `server.js`):
```javascript
const CONFIG = {
  port: 5065,
  voiceId: '3JDquces8E8bkmvbh6Bc',    // Japanese voice
  model: 'eleven_flash_v2_5',          // Fast Flash model
  cacheDir: './cache',
  maxTextLength: 500
};
```

## Cache Management

### How Caching Works

1. Text is hashed using SHA-256
2. Check if `cache/{hash}.mp3` exists
3. If exists: serve immediately (cache HIT)
4. If not: call ElevenLabs API, save to cache, serve (cache MISS)

### Cache Structure

```
cache/
├── a1b2c3d4...mp3     # Audio file
├── a1b2c3d4...json    # Metadata (text, timestamp, size)
├── e5f6g7h8...mp3
├── e5f6g7h8...json
└── .gitkeep
```

### Why SHA-256?

- **Collision-resistant** - Virtually impossible for different text to produce same hash
- **Fixed length** - Always 64 characters, safe for all filesystems
- **No encoding issues** - Handles Japanese characters perfectly
- **Content-addressed** - Same text always produces same hash

### Cache Size

- Each MP3: ~10-50 KB
- Typical usage: ~1000 unique conjugations = ~50 MB
- Cache persists across restarts
- Manual clearing available via Management UI

## Management UI

Open http://localhost:5065 in your browser to access the dashboard.

**Features:**
- **Real-time statistics** - Total files, total size
- **Test TTS generation** - Input text and play audio
- **Cache browser** - List all cached items with play/delete buttons
- **Clear cache** - Remove all cached files with confirmation

## Integration with Frontend

The frontend automatically calls this service when displaying results:

```typescript
// In AudioContext.tsx
const playTTS = async (text: string) => {
  const url = `http://localhost:5065/tts?text=${encodeURIComponent(text)}`;
  const audio = new Audio(url);
  audio.volume = 0.7;
  await audio.play();
};
```

**Timing:**
1. Sound effect plays (correct.mp3 or wrong.mp3)
2. 300ms delay
3. TTS pronunciation plays

## Development

### Start with --watch (auto-restart on changes)
```bash
npm run dev
```

### Start without --watch
```bash
npm start
```

### Run alongside frontend
```bash
# From project root
npm run dev:all
```

This starts both:
- Frontend on http://localhost:5173 (or 5174)
- TTS service on http://localhost:5065

## Troubleshooting

### Port 5065 already in use
```bash
# Find process using port
lsof -ti:5065

# Kill process
kill -9 $(lsof -ti:5065)
```

### API key not found
Verify that your API keys are correctly set in the `.env` file in the project root.
- `ELEVENLABS_API_KEY`
- `AZURE_API_KEY`

### CORS errors in browser
The service enables CORS for all origins. If you still see errors:
1. Check browser console for exact error
2. Verify service is running on port 5065
3. Try clearing browser cache

### TTS not playing in frontend
1. Check browser console for errors
2. Open http://localhost:5065 and test TTS there
3. Verify audio permissions in browser
4. Check browser's audio policy (some browsers block auto-play)

### Cache not working
```bash
# Check cache directory exists
ls -la cache/

# Check permissions
ls -ld cache/

# Manually test caching
curl "http://localhost:5065/tts?text=test" -I
# Should show X-Cache-Status: MISS first time

curl "http://localhost:5065/tts?text=test" -I
# Should show X-Cache-Status: HIT second time
```

## Cost Optimization

**ElevenLabs Pricing** (as of 2024):
- Free tier: 10,000 characters/month
- Paid tier: $5-$99/month

**Cache Benefits:**
- Each unique conjugation generates TTS once
- Subsequent uses are free (served from cache)
- Typical app usage: ~100-200 unique conjugations
- Cache persists across app restarts
- No cache expiration (conjugations don't change)

**Estimated Costs:**
- Development: Free tier sufficient
- Production: ~$5-10/month for active users

## Technical Details

**Dependencies:**
- `express` - Web framework
- `cors` - CORS middleware

**Node.js Requirements:**
- Node 18+ for native `fetch()` API
- `--watch` flag for auto-restart (Node 18+)

**ElevenLabs API:**
- Endpoint: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- Model: `eleven_flash_v2_5` (fast, cost-effective)
- Voice: `3JDquces8E8bkmvbh6Bc` (Japanese)
- Settings: Stability 0.5, Similarity 0.75

## License

MIT
