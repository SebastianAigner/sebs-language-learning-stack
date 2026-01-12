#!/bin/bash

# Session Name
SESSION="language-learning-stack"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux could not be found. Please install it to use this script."
    exit 1
fi

# Kill existing session if it exists
tmux kill-session -t $SESSION 2>/dev/null

# Load environment variables from .env if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "Loading environment variables from .env"
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

# Create a new tmux session with banner pane at top
tmux new-session -d -s $SESSION -n "services"

# Pane 0: Banner (top, full width)
tmux send-keys -t $SESSION:0 "cat '$SCRIPT_DIR/banner.txt' && read" C-m

# Split below banner for services
# (Note: we use the initial pane 0 for the banner, and subsequent splits create new panes)

# Pane 1: brickwall (Vite)
BRICKWALL_PORT=${BRICKWALL_PORT:-5173}
PANE_BRICKWALL=$(tmux split-window -v -t $SESSION:0 -P -F "#{pane_id}")
tmux send-keys -t $PANE_BRICKWALL "cd '$SCRIPT_DIR/brickwall' && npm run dev -- --port $BRICKWALL_PORT" C-m

# Pane 2: jpdb-review-transcriber
PANE_TRANSCRIBER=$(tmux split-window -h -t $PANE_BRICKWALL -P -F "#{pane_id}")
tmux send-keys -t $PANE_TRANSCRIBER "cd '$SCRIPT_DIR/jpdb-review-transcriber' && npm run dev" C-m

# Pane 3: jpdb-word-production-trainer
PANE_WORD_PROD=$(tmux split-window -v -t $PANE_BRICKWALL -P -F "#{pane_id}")
tmux send-keys -t $PANE_WORD_PROD "cd '$SCRIPT_DIR/jpdb-word-production-trainer' && npm start" C-m

# Pane 4: tts-server
PANE_TTS=$(tmux split-window -h -t $PANE_WORD_PROD -P -F "#{pane_id}")
tmux send-keys -t $PANE_TTS "cd '$SCRIPT_DIR/tts-server' && npm run dev" C-m

# Pane 5: jpdb-conjugation-trainer
CONJUGATION_PORT=${CONJUGATION_PORT:-5174}
PANE_CONJUGATION=$(tmux split-window -v -t $PANE_TTS -P -F "#{pane_id}")
tmux send-keys -t $PANE_CONJUGATION "cd '$SCRIPT_DIR/jpdb-conjugation-trainer' && npm run dev -- --port $CONJUGATION_PORT" C-m

# Resize banner pane to be small
tmux select-pane -t $SESSION:0.0
tmux resize-pane -U 100

# Select banner pane and attach
tmux attach-session -t $SESSION
