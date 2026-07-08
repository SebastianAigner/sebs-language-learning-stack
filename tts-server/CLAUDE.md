# CLAUDE.md - TTS Server

## Project Overview
A Japanese Text-to-Speech microservice supporting ElevenLabs, Azure Speech, and OpenRouter Speech APIs with caching.

## Tech Stack
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript
- **TTS Providers**: ElevenLabs, Azure Cognitive Services, OpenRouter Speech
- **Testing**: Vitest

## Development Workflow
1. **Always run type checking before committing**: `npm run type-check`
2. **Always run linting before committing**: `npm run lint`
   - Fix linting issues with: `npm run lint:fix`
   - Linting uses strict type-checked rules including no-floating-promises, no-misused-promises, await-thenable
   - Test files (*.test.ts) are excluded from type-checked linting
3. Run tests: `npm test`
4. Dev server with hot reload: `npm run dev`
5. Build for production: `npm run build`
6. Use single quotes for git commits (per global CLAUDE.md)

**Important**: Both type-check and lint must pass before commits are made.

## Key Files
- `src/server.ts` - Main Express server with TTS endpoints and caching logic
- `src/utils.ts` - Utility functions
- `.eslintrc.json` - ESLint configuration with type-checked rules
- `tsconfig.json` - TypeScript configuration

## API Endpoints
- `GET /tts?text=...&previous_text=...&suffix_text=...` - Generate or serve cached TTS audio
- `GET /api/config` - Return public, non-secret TTS defaults for clients
- `GET /api/cache` - Get cache statistics
- `POST /api/regenerate` - Delete cached audio and regenerate
- `POST /api/test` - Test TTS generation

## Code Patterns
- Use TypeScript strict mode
- Prefer type imports (`import type { ... }`) for types-only imports
- Express route handlers should return void, not Promise
- Wrap async operations in `void (async () => { ... })()` pattern for Express handlers
- Use proper TypeScript generics for Express Request types: `Request<Params, ResBody, ReqBody>`

## Environment Variables
- `TTS_PROVIDER` - 'elevenlabs', 'azure', or 'openrouter'
- `TTS_DEFAULT_PREVIOUS_TEXT` - Default previous/context text when requests omit `previous_text`
- `TTS_DEFAULT_SUFFIX_TEXT` - Default suffix/context text when requests omit `suffix_text`
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `AZURE_API_KEY` - Azure Speech API key
- `AZURE_REGION` - Azure region (default: swedencentral)
- `OPENROUTER_API_KEY` - OpenRouter API key
- `OPENROUTER_TTS_MODEL` - OpenRouter speech model
- `OPENROUTER_TTS_VOICE` - OpenRouter speech voice
- `OPENROUTER_TTS_RESPONSE_FORMAT` - 'pcm' or 'mp3' (pcm is converted to WAV)
- `TTS_TRIM_AFTER_SILENCE` - Trim generated audio after the first detected long silence before caching
- `TTS_TRIM_SILENCE_THRESHOLD_DB` - ffmpeg `silencedetect` noise threshold (default: -45)
- `TTS_TRIM_SILENCE_MIN_MS` - Minimum silence duration to trigger trimming (default: 750)
- `TTS_TRIM_LEADING_SILENCE` - Trim real detected silence at the start of generated audio (default: true)
- `TTS_TRIM_LEADING_KEEP_MS` - Leading silence pad to retain before the word starts (default: 50)
- `TTS_TRIM_KEEP_SILENCE_MS` - Amount of detected silence to retain after the phrase (default: 150)
- `TTS_TRIM_MIN_AUDIO_MS` - Ignore silence starts before this much audio has elapsed (default: 250)
- `TTS_NORMALIZE_LOUDNESS` - Normalize perceived loudness (EBU R128) so English and Japanese audio match in volume (default: true)
- `TTS_NORMALIZE_TARGET_LUFS` - Target integrated loudness in LUFS (default: -16)
- `TTS_NORMALIZE_TRUE_PEAK_DB` - Maximum true peak in dBTP (default: -1.5)
- `TTS_NORMALIZE_LRA` - Target loudness range for loudnorm (default: 11)
- `FFMPEG_PATH` - ffmpeg binary path (default: ffmpeg)
- `TTS_SERVER_PORT` - Server port (default: 5065)
