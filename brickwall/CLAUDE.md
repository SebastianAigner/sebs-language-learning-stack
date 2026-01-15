# CLAUDE.md - Brickwall (Converser)

## Project Overview
A React-based chat interface for interacting with various LLM providers via OpenRouter.

## Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Plain CSS
- **API Integration**: OpenRouter API for LLM access

## Development Workflow
1. **Always run linting before committing**: `npm run lint`
   - Linting uses strict type-checked rules including no-floating-promises, no-misused-promises, await-thenable
   - Uses ESLint flat config format (eslint.config.js)
2. **Build the project**: `npm run build` (runs tsc + vite build)
3. Dev server: `npm run dev`
4. Use single quotes for git commits (per global CLAUDE.md)

**Important**: Lint must pass before commits are made.

## Key Files
- `src/App.tsx` - Main application component with chat UI and API integration
- `src/App.css` - Application styles
- `eslint.config.js` - ESLint configuration with type-checked rules
- `vite.config.ts` - Vite configuration with custom startup plugin

## Code Patterns
- Use TypeScript strict mode
- Prefer type imports (`import type { ... }`) for types-only imports
- Use `void` operator for intentionally unhandled promises in event handlers
- Handle async functions in React event handlers by wrapping with `void` or arrow functions returning void
