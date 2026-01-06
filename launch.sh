#!/bin/bash

# Auto-detected paths for Docker on macOS
DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin/docker"
COMPOSE_BIN="/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose"

echo "🚀 Launching Big SIS with auto-detected Docker..."

if [ -f "$COMPOSE_BIN" ]; then
    echo "Found docker-compose plugin at $COMPOSE_BIN"
    "$COMPOSE_BIN" up -d --build
elif [ -f "$DOCKER_BIN" ]; then
    echo "Found docker at $DOCKER_BIN, trying to use 'compose' subcommand..."
    "$DOCKER_BIN" compose up -d --build
else
    echo "❌ Docker not found in standard /Applications path."
    echo "Please ensure Docker Desktop is installed and running."
    exit 1
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Application is running."
    echo "App (Frontend): http://localhost:5173 (or 3000)"
    echo "Brain (API): http://localhost:8000/docs"
else
    echo "❌ Failed to start containers."
fi
