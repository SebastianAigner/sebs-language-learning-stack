# Japanese Conjugation Trainer

An application for practicing Japanese verb and adjective conjugations (ichidan/godan verbs and i-adjectives) using spaced repetition and LLM-based grading.

## Features

- **Vocabulary Integration**: Fetches verbs and adjectives from your daily JPDB reviews via localhost:3000
- **Intelligent Scheduling**: Uses spaced repetition with reschedule intervals [10, 15, 20, 30]
- **Streaming LLM Grading**: Real-time streaming responses from OpenRouter with:
  - Token-by-token display with blinking cursor
  - Reasoning tokens shown in collapsible section
  - Thinking indicators (animated emojis) when model is reasoning
  - Auto-collapse reasoning when answer begins
- **Configurable Practice**: Select which conjugation types to practice via settings panel
- **17 Conjugation Forms**: Practice casual and polite forms of:
  - Non-past affirmative
  - Past affirmative
  - Negative (non-past)
  - Negative-past
  - Progressive (ている)
  - Progressive-past (ていた)
  - Negative progressive (ていない)
  - Negative progressive-past (ていなかった)
  - Te-form (て-form)

## Prerequisites

- Node.js 18+ and npm
- JPDB review transcriber service running on `localhost:3000`
- OpenRouter API key

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configuration:
   The application uses the centralized `.env` file in the project root. Ensure `OPENROUTER_API_KEY` is set there.

3. Ensure your JPDB review service is running on port 3000

## Development

Start the development server:
```bash
npm run dev
```

Run type checking:
```bash
npm run type-check
```

Run linting:
```bash
npm run lint
```

Run tests:
```bash
npm test
```

Run integration tests (requires OpenRouter API key):
```bash
npm run test:integration
```

## Building

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## How It Works

### Vocabulary Fetching
The app fetches vocabulary from the JPDB API at `localhost:3000/today` and filters for ichidan/godan verbs and i-adjectives.

### Scheduling Algorithm
Based on the reference project's proven scheduling system:
- Wrong answers are rescheduled at 4 future positions: [10, 15, 20, 30] items ahead
- After 3 consecutive correct answers, excess future occurrences are removed
- Consecutive duplicates are automatically spread apart by at least 3 positions

### Grading
Uses the official OpenRouter SDK to grade answers:
- Correct answers receive a ⭐ emoji
- Incorrect answers receive a ✨ emoji with explanation
- Default model: Grok 4 (configurable via UI)

### Persistence
- Review session state persists in browser localStorage
- Model configuration persists across sessions
- Resume interrupted sessions automatically

## Architecture

```
src/
├── api.ts              # API client for fetching vocabulary
├── scheduler.ts        # Spaced repetition scheduling algorithm
├── grader.ts          # OpenRouter integration for grading
├── persistence.ts     # localStorage management
├── audio.ts           # Audio feedback
├── main.ts            # Main application controller
├── types.ts           # TypeScript type definitions
└── styles.css         # UI styles
```

## Testing

The project includes:
- Unit tests for scheduler logic (src/scheduler.test.ts)
- Unit tests for API parsing (src/api.test.ts)
- Integration tests for OpenRouter SDK (src/grader.integration.test.ts)

All tests use Vitest and are configured to run with TypeScript.

## License

MIT
