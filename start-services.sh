#!/bin/bash

# Session Name
SESSION="language-learning-stack"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux could not be found. Please install it to use this script."
    exit 1
fi

# Kill existing session if it exists
tmux kill-session -t $SESSION 2>/dev/null

# Create a new tmux session, but don't attach yet
tmux new-session -d -s $SESSION -n "services"

# Pane 1: brickwall (Vite)
tmux send-keys -t $SESSION:0 "cd brickwall && npm run dev" C-m

# Pane 2: jpdb-review-transcriber
tmux split-window -v -t $SESSION:0
tmux send-keys -t $SESSION:0 "cd jpdb-review-transcriber && npm run dev" C-m

# Pane 3: tts-server (jpdb-tts-service)
tmux split-window -h -t $SESSION:0.1
tmux send-keys -t $SESSION:0 "cd tts-server && npm run dev" C-m

# Pane 4: jpdb-word-production-trainer
tmux split-window -h -t $SESSION:0.0
tmux send-keys -t $SESSION:0 "cd jpdb-word-production-trainer && node server.js" C-m

# Pane 5: jpdb-conjugation-trainer
tmux split-window -v -t $SESSION:0.2
tmux send-keys -t $SESSION:0 "cd jpdb-conjugation-trainer && npm run dev" C-m

# Pane 6: Help message
tmux split-window -v -t $SESSION:0.0
tmux send-keys -t $SESSION:0 "echo 'Want to leave? Hit Ctrl-B :kill-session' && read" C-m

# Select the first pane and attach
tmux select-pane -t $SESSION:0.0
tmux attach-session -t $SESSION
