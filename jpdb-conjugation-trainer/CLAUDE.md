# CLAUDE.md - Japanese Conjugation Trainer

## Project Overview
This is a spaced repetition application for practicing Japanese verb and adjective conjugations using LLM-based grading with streaming responses.

## Tech Stack
- **Frontend**: Vanilla TypeScript with Vite
- **API Integration**: OpenRouter SDK for LLM grading
- **Testing**: Vitest
- **Data Source**: JPDB review transcriber service (localhost:3000)

## Key Architecture Decisions
- Pure TypeScript without framework dependencies (React/Vue)
- Streaming LLM responses with token-by-token display
- LocalStorage-based persistence for session state
- Spaced repetition scheduling with configurable intervals [10, 15, 20, 30]

## Development Workflow
1. Always run type checking before committing: `npm run type-check`
2. Run linting to catch issues: `npm run lint`
3. Run unit tests: `npm test`
4. Dev server runs on port 5174
5. Use single quotes for git commits (per global CLAUDE.md)

## Important Files
- `src/main.ts` - Main application controller and UI logic
- `src/scheduler.ts` - Core spaced repetition algorithm
- `src/grader.ts` - OpenRouter integration with streaming support
- `src/api.ts` - JPDB API client
- `src/persistence.ts` - LocalStorage management
- `.env` - Centralized environment configuration (in project root)

## Code Patterns
- Use TypeScript strict mode
- Prefer explicit types over inference for public APIs
- Keep DOM manipulation centralized in main.ts
- Use functional programming patterns in scheduler.ts
- Handle streaming responses with proper token parsing

## Testing Guidelines
- Unit tests for pure logic (scheduler, API parsing)
- Integration tests for external services (OpenRouter)
- Mock external dependencies in unit tests
- Use Vitest test runners

## Constraints
- Must maintain compatibility with JPDB API at localhost:3000
- OpenRouter API key required (via `.env`) for grading functionality
- Support 17 conjugation forms (casual/polite variants)
- Maintain backward compatibility with localStorage schema

## When Making Changes
1. Ensure type-check passes
2. Update tests if logic changes
3. Test streaming UI if modifying grader.ts
4. Verify localStorage compatibility
5. Check that dev server still runs on port 5174
