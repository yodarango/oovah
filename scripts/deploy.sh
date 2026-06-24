#!/bin/zsh

source ~/.zshrc

# Parse arguments: optional --reset flag followed by a commit message
RESET=false
COMMIT_MESSAGE=""

if [ "$#" -eq 1 ]; then
    COMMIT_MESSAGE="$1"
elif [ "$#" -eq 2 ] && [ "$1" = "--reset" ]; then
    RESET=true
    COMMIT_MESSAGE="$2"
else
    echo "Usage: ./deploy.sh [--reset] \"commit message\""
    exit 1
fi

# Build reset commands if needed (removes containers/images but keeps the DB bind mount)
RESET_COMMANDS=""
if [ "$RESET" = true ]; then
    RESET_COMMANDS="docker compose down --rmi all; "
fi

# Add changes to the staging area
# You can adjust this to add specific files or use other git add options
git add .

# Commit the changes with the provided commit message
git commit -m "$COMMIT_MESSAGE"

# Push changes to the Git repository
git push

# Check if the push was successful
if [ $? -eq 0 ]; then
    echo "🐈 Done pushing changes to git. Now pulling changes to VPS."
else
    echo "Git push failed"
    exit 1
fi

# Copy the files to the VPS
ssh_main "\
cd /var/www/repos/oovah/app; \
git reset --hard origin/main; \
git pull; \
echo '👍 pulled changes from git and reset to origin'; \
echo 'Current directory: '; pwd; \
echo '🏗️ Building docker now...';\
$RESET_COMMANDS \
docker compose up -d --build; \
echo '🚀🚀🚀 Deployment successful'"


echo "⭐️🚀✅ Deployment successful"
