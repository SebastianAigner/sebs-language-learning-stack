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

# Create a new tmux session with banner pane at top
tmux new-session -d -s $SESSION -n "services"

# Pane 0: Banner (top, full width)
tmux send-keys -t $SESSION:0 "cat '$SCRIPT_DIR/banner.txt' && read" C-m

# Split below banner for services
tmux split-window -v -t $SESSION:0

# Pane 1: brickwall (Vite)
tmux send-keys -t $SESSION:0.1 "cd '$SCRIPT_DIR/brickwall' && npm run dev" C-m

# Split horizontally for more service panes
tmux split-window -h -t $SESSION:0.1

# Pane 2: jpdb-review-transcriber
tmux send-keys -t $SESSION:0.2 "cd '$SCRIPT_DIR/jpdb-review-transcriber' && npm run dev" C-m

# Split pane 1 vertically
tmux split-window -v -t $SESSION:0.1

# Pane 3: jpdb-word-production-trainer
tmux send-keys -t $SESSION:0.2 "cd '$SCRIPT_DIR/jpdb-word-production-trainer' && node server.js" C-m

# Split pane 3 horizontally
tmux split-window -h -t $SESSION:0.3

# Pane 4: tts-server
tmux send-keys -t $SESSION:0.4 "cd '$SCRIPT_DIR/tts-server' && npm run dev" C-m

# Split for conjugation trainer
tmux split-window -v -t $SESSION:0.4

# Pane 5: jpdb-conjugation-trainer
tmux send-keys -t $SESSION:0.5 "cd '$SCRIPT_DIR/jpdb-conjugation-trainer' && npm run dev" C-m

# Resize banner pane to be small
tmux select-pane -t $SESSION:0.0
tmux resize-pane -D 100

# Select banner pane and attach
tmux attach-session -t $SESSION
