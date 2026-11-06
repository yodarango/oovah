#!/bin/zsh

# Deploy = push to main. GitHub Actions builds the Docker image, pushes it to
# GHCR, then SSHes into the VPS and runs `docker rollout oovah_app`, which
# swaps containers with zero downtime (no more builds on the VPS).

if [ "$#" -ne 1 ]; then
    echo "Usage: ./deploy.sh \"commit message\""
    exit 1
fi

COMMIT_MESSAGE="$1"

# Add changes to the staging area
# You can adjust this to add specific files or use other git add options
git add .

# Commit the changes with the provided commit message
git commit -m "$COMMIT_MESSAGE"

# Push changes to the Git repository
git push

# Check if the push was successful
if [ $? -eq 0 ]; then
    echo "🐈 Pushed to main. GitHub Actions is building and deploying now."
    echo "👀 Watch progress: https://github.com/yodarango/oovah/actions"
else
    echo "Git push failed"
    exit 1
fi

echo "⭐️🚀✅ Deployment triggered"
