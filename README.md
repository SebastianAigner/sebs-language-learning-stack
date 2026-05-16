# Seb's Language Learning Stack

A collection of interconnected tools and services for Japanese language learning, specifically designed to integrate with [jpdb.io](https://jpdb.io).

## 🚀 Getting Started

This project uses **npm workspaces** to manage multiple sub-packages.

### Prerequisites

- [Node.js](https://nodejs.org/) (latest LTS recommended)
- [tmux](https://github.com/tmux/tmux) (required for the orchestrated startup script)

### Installation

Install all dependencies for all projects in one command:

```bash
npm install
```

### Starting the Stack

The entire stack can be launched using the provided `start-services.sh` script, which orchestrates several services in a `tmux` session:

```bash
./start-services.sh
```

Alternatively, you can run it via npm:

```bash
npm start
```

## 🛠 Included Tools

### Web Applications
- **[brickwall](./brickwall)**: A Vite-based React application (Converser).
- **[jpdb-conjugation-trainer](./jpdb-conjugation-trainer)**: Japanese verb conjugation practice (動詞推し).
- **[jpdb-word-production-trainer](./jpdb-word-production-trainer)**: Vocabulary review trainer with spaced repetition and production practice.

### Backend Services
- **[tts-server](./tts-server)**: Japanese TTS microservice supporting Azure Speech, ElevenLabs, and OpenRouter Speech.
- **[jpdb-review-transcriber](./jpdb-review-transcriber)**: Server to store and retrieve timestamped text entries.

### Browser Extensions
- **[userscripts](./userscripts)**: A collection of Tampermonkey/Greasemonkey scripts for enhancing the jpdb.io experience, including:
  - Quick Add by Ear
  - Absolute New Counts
  - Hide Low Frequency Kanji Readings
  - And more.

## 🔑 Configuration

The stack is configured using a centralized `.env` file in the root directory.

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your API keys:
   - `ELEVENLABS_API_KEY`: Your ElevenLabs API key.
   - `AZURE_API_KEY`: Your Azure Speech API key.
   - `OPENROUTER_API_KEY`: Your OpenRouter API key.

*Note: Be careful not to commit `.env` containing secrets. It is already included in `.gitignore`.*

## ⌨️ Shortcuts

When running via `start-services.sh`:
- **Ctrl-B, D**: Detach from the tmux session.
- **Ctrl-B, :kill-session**: Stop all services and close the session.
