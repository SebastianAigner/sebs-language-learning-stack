# Japanese Vocabulary Review Trainer

A browser-only web application for reviewing Japanese vocabulary with spaced repetition and production practice.

## Features

- **Production Practice**: Type Japanese answers (kanji/kana) for English definitions
- **Spaced Repetition**: Incorrect items are rescheduled multiple times with increasing intervals
- **Smart Scheduling**: Items marked wrong reappear at intervals of 10, 15, 20, and 30 cards
- **First-Try Tracking**: Only words answered correctly on the first attempt count toward your review statistics
- **Exact Match Detection**: Visual feedback (green outline) when your answer exactly matches
- **Auto-Advance**: Correct answers automatically advance to the next card after 1 second
- **Audio Feedback**: Plays a sound effect when you get an exact match (requires `audio/correct.mp3`)
- **Persistence**: All session data persists across page reloads using localStorage
- **Smart Keyboard Shortcuts**: Press spacebar to grade - auto-selects "Good" for exact matches, "Not Good" otherwise
- **Debug Panels**: Collapsible views showing the current queue and completed items

## Requirements

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Node.js (to run the local server)
- A vocabulary service running at `http://localhost:3000` (configurable)
- The service must provide an endpoint that returns vocabulary items reviewed today

## Quick Start

1. **Start your vocabulary service** (default: `http://localhost:3000`)

2. **Start the app server**:
   ```bash
   node server.js
   ```
   The server will run at `http://localhost:8080`

3. **Open in browser**: Navigate to `http://localhost:8080`

4. **Review workflow**:
   - Read the English definition
   - Type the Japanese answer (kanji/kana)
   - Click Submit or press Enter
   - Review the side-by-side comparison
   - Grade yourself: "Good" or "Not Good" (spacebar works for "Good")
   - Continue until the queue is exhausted

## Configuration

### Service URL

You can configure the vocabulary service URL in two ways:

1. **Runtime**: Enter the URL in the input field at the top of the page
2. **Code**: Edit `js/config.js` and change `DEFAULT_SERVICE_URL`

### TTS Prefix And Suffix Text

The settings panel includes optional **TTS prefix text** and **TTS suffix text** fields. When they are non-blank, the trainer sends them as `previous_text` and `suffix_text` to the TTS service for each spoken answer. Leave them blank to use the TTS server defaults.

### Scheduling Parameters

To adjust the rescheduling intervals, edit `js/config.js`:

```javascript
RESCHEDULE_INTERVALS: [10, 15, 20, 30]  // Number of items before re-prompting
```

### Service Endpoint

The app expects the service to provide a specific endpoint. The default endpoint path is defined in `js/config.js`:

```javascript
REVIEWED_TODAY_ENDPOINT: '/api/v1/cards/reviewed-today'
```

Update this after discovering your service's actual endpoint structure.

### Audio Setup (Optional)

To enable audio feedback:

1. Place MP3 files at:
   - `audio/correct.mp3` - Plays when you get an exact match
   - `audio/wrong.mp3` - Plays when your answer is incorrect
2. Recommended: Keep audio files short (< 1 second) for best experience

You can find free sound effects at:
- [Freesound.org](https://freesound.org/) (search: "correct", "ding", "chime", "wrong", "buzz")
- [Mixkit](https://mixkit.co/free-sound-effects/)
- [Zapsplat](https://www.zapsplat.com/)

If audio files are missing, the app will work normally without sound (a warning will appear in the browser console).

## Service API Requirements

### Expected Endpoint

The app calls: `GET {serviceUrl}{REVIEWED_TODAY_ENDPOINT}`

Example: `GET http://localhost:3000/api/v1/cards/reviewed-today`

### Expected Response Format

The service should return JSON with vocabulary items. The app supports multiple formats:

**Option 1: Direct array**
```json
[
  {
    "vocabularyId": "123",
    "japaneseText": "食べる",
    "englishDefinition": "to eat"
  }
]
```

**Option 2: Wrapped in object**
```json
{
  "items": [...]
}
```

Or use keys: `cards`, `vocabulary`, etc.

### Required Fields (flexible naming)

Each vocabulary item should include:

- **Unique ID**: `vocabularyId`, `vid`, or `id`
- **Japanese text**: `japaneseText`, `japanese`, or `spelling`
- **English definition**: `englishDefinition`, `english`, `meaning`, or `definition`
- **Timestamp** (optional): `reviewedAt`, `timestamp`, or `date`

The app automatically deduplicates items based on the unique ID or Japanese text.

## Session Data

All session data is stored in `localStorage` under the key `jpdb-trainer-state`:

- Current queue position
- Attempt tracking for first-try detection
- Rescheduled item state
- "Reviewed correctly" list
- Session statistics
- Service URL configuration
- TTS prefix text
- TTS suffix text

### Resetting Data

Click the **"Reset All Data"** button to clear all persisted data and start fresh.

## Grading Logic

### "Good" on First Try
- Item is added to "Reviewed Correctly" list
- Statistics counter increments
- Item is removed from queue

### "Not Good" on First Try
- Item is removed from current position
- Multiple copies are scheduled to reappear at intervals: +10, +15, +20 items later
- On second "Not good", even more re-prompts are scheduled
- Attempt counter increments

### "Good" on Retry
- Item is removed from queue
- Statistics counter does NOT increment (already counted as incorrect)

## Keyboard Shortcuts

- **Enter**: Submit answer (when input is focused)
- **Spacebar**: Grade answer (when comparison view is visible)
  - Auto-selects "Good" if answer exactly matches
  - Auto-selects "Not Good" if answer doesn't match

## Debug Features

Expand the debug panels at the bottom to see:

- **Queue**: Upcoming items in order (shows next 20 items)
  - Items with badge "R1", "R2", etc. are rescheduled items
- **Reviewed Correctly**: All items answered correctly on first try

## Browser Compatibility

Requires ES6 module support:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

## Development Notes

### File Structure

```
/
├── index.html              # Main HTML structure
├── styles.css              # Minimal/spartan UI styling
├── js/
│   ├── main.js            # App initialization & coordination
│   ├── state.js           # State management & localStorage
│   ├── api.js             # Service communication & deduplication
│   ├── scheduler.js       # Queue & rescheduling algorithm
│   ├── ui.js              # DOM manipulation & event handling
│   └── config.js          # Configuration constants
└── README.md              # This file
```

### Discovering Service Endpoints

During development, you can discover available endpoints by opening the browser console and running:

```javascript
import { discoverEndpoints } from './js/api.js';
discoverEndpoints('http://localhost:3000').then(console.log);
```

Update `REVIEWED_TODAY_ENDPOINT` in `js/config.js` with the correct path.

### CORS Configuration

If the vocabulary service is on a different origin, ensure it has proper CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Troubleshooting

### "Cannot reach vocabulary service"

1. Verify the service is running: `curl http://localhost:3000`
2. Check the endpoint path in `js/config.js`
3. Verify CORS headers if service is on different origin
4. Check browser console for detailed error messages

### "No vocabulary items found"

1. Ensure you've reviewed some words in the source system today
2. Verify the endpoint returns a non-empty array
3. Check the response format matches expected structure

### Session not persisting

1. Check if browser has localStorage enabled
2. Check for quota exceeded errors in console
3. Try clicking "Reset All Data" to clear corrupted state

### Japanese text not displaying correctly

1. Ensure your system has Japanese fonts installed
2. Try installing "Noto Sans JP" font
3. Check that input field has proper font-family CSS

## License

MIT License - feel free to use and modify as needed.

## Contributing

This is a standalone browser application with no build process. To modify:

1. Edit the relevant JavaScript modules in `js/`
2. Update styles in `styles.css`
3. Refresh the browser to see changes

No compilation or bundling required!
