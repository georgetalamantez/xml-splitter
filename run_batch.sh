#!/bin/bash

# Ensure we exit on errors
set -e

REPO="georgetalamantez/xml-splitter"
# Replace 'npm start' with your actual batch processing command if it's different
BATCH_CMD="cd /workspaces/xml-splitter && npm start" 

echo "🔍 Finding your Codespace..."
CS_NAME=$(gh codespace list -R $REPO --json name -q '.[0].name')

if [ -z "$CS_NAME" ]; then
    echo "🚀 1. Spinning up a NEW Codespace..."
    gh codespace create -R $REPO --machine basicLinux32gb > /dev/null 2>&1
    CS_NAME=$(gh codespace list -R $REPO --json name -q '.[0].name')
    echo "✅ Created Codespace: $CS_NAME"
else
    echo "🚀 1. Existing Codespace found: $CS_NAME"
    echo "   Starting it up (this may take a moment if it is asleep)..."
    # Starting a stopped codespace
    # (Rebuilding only if needed, but assuming it has our latest devcontainer config now)
    gh codespace ssh -c "$CS_NAME" --command "echo 'Codespace is awake!'" > /dev/null 2>&1 || true
fi

echo "⚙️ 2. Running batch process inside Codespace..."
echo "Executing: $BATCH_CMD"
gh codespace ssh -c "$CS_NAME" --command "$BATCH_CMD"

echo "🛑 3. Spinning down Codespace to save compute hours..."
gh codespace stop -c "$CS_NAME"

echo "✅ All done!"
