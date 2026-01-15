# CLAUDE.md - TTS Server

## Project Overview
A Japanese Text-to-Speech microservice supporting ElevenLabs and Azure Speech APIs with caching.

## Tech Stack
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript
- **TTS Providers**: ElevenLabs, Azure Cognitive Services
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
- `GET /tts?text=...&previous_text=...` - Generate or serve cached TTS audio
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
- `TTS_PROVIDER` - 'elevenlabs' or 'azure'
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `AZURE_API_KEY` - Azure Speech API key
- `AZURE_REGION` - Azure region (default: swedencentral)
- `TTS_SERVER_PORT` - Server port (default: 5065)
