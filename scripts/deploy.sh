#!/bin/zsh

# Same process as the other apps (bennana, etc.): push to main, then SSH into
# the VPS, pull the repo, and rebuild the Docker image there. All remote
# output streams to this terminal, so deployment progress is always visible.

source ~/.zshrc

# Check if a commit message was provided
if [ "$#" -ne 1 ]; then
    echo "Usage: ./deploy.sh \"commit message\""
    exit 1
fi

# The commit message is the first argument to the script
COMMIT_MESSAGE="$1"

# Add changes to the staging area
# You can adjust this to add specific files or use other git add options
git add .

# Commit the changes with the provided commit message
if ! git commit -m "$COMMIT_MESSAGE"; then
    echo "Nothing to commit?"
    exit 1
fi

# Push changes to the Git repository
if ! git push; then
    echo "Git push failed"
    exit 1
fi

echo "🐈 Done pushing changes to git. Now pulling changes to VPS."

# Pull the changes on the VPS and rebuild the app there
ssh_main "\
cd /var/www/repos/oovah/app; \
git reset --hard origin/main; \
git pull; \
echo '👍 pulled changes from git and reset to origin'; \
echo 'Current directory: '; pwd; \
echo '🏗️ Building docker now...';\
docker compose down; \
export DOCKER_BUILDKIT=1; \
export COMPOSE_DOCKER_CLI_BUILD=1; \
docker compose build --parallel; \
docker compose up -d; \
echo '🧹 Cleaning old docker build cache and dangling images...'; \
docker image prune -f; \
docker builder prune -f --filter until=24h; \
echo '🚀🚀🚀 Deployment successful'"

if [ $? -eq 0 ]; then
    echo "⭐️🚀✅ Deployment successful"
else
    echo "❌ Deployment failed — see the VPS output above"
    exit 1
fi
