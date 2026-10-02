#!/bin/bash
# Install dependencies in cloud sessions so tests and builds work immediately.
set -e
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
