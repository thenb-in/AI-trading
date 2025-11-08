#!/bin/bash

# Define repository details
# Get the GitHub remote URL (assumes "origin" remote)
REMOTE_URL=$(git config --get remote.origin.url)
REPO_NAME=$(basename -s .git "$REMOTE_URL")

# Strip the .git suffix if present
REMOTE_URL=${REMOTE_URL%.git}

# Extract owner and repo from SSH or HTTPS URL
if [[ "$REMOTE_URL" =~ ^git@github\.com:(.+)/(.+)$ ]]; then
    GITHUB_OWNER="${BASH_REMATCH[1]}"
    GITHUB_REPO="${BASH_REMATCH[2]}"
elif [[ "$REMOTE_URL" =~ ^https://github\.com/(.+)/(.+)$ ]]; then
    GITHUB_OWNER="${BASH_REMATCH[1]}"
    GITHUB_REPO="${BASH_REMATCH[2]}"
else
    echo "Unsupported remote URL format: $REMOTE_URL"
    exit 1
fi



# Prompt user for GitHub Token securely
read -s -p "Enter your GitHub Token for $GITHUB_OWNER/$GITHUB_REPO: " GITHUB_TOKEN
echo ""

# Fetch the latest successful workflow run ID
LATEST_RUN_ID=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/actions/runs?status=success&per_page=1" | \
    jq -r '.workflow_runs[0].id')

# Check if a run was found
if [[ "$LATEST_RUN_ID" == "null" ]]; then
    echo "No successful workflow runs found!"
    exit 1
fi

echo "Latest workflow run ID: $LATEST_RUN_ID"

# Get artifact download URL
ARTIFACT_URL=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/actions/runs/$LATEST_RUN_ID/artifacts" | \
    jq -r '.artifacts[0].archive_download_url')

# Check if an artifact exists
if [[ "$ARTIFACT_URL" == "null" ]]; then
    echo "No artifacts found for the latest workflow run!"
    exit 1
fi

echo "Downloading latest artifact..."

# Download the artifact
curl -L -H "Authorization: token $GITHUB_TOKEN" -o artifact.zip "$ARTIFACT_URL"

# Extract the artifact
# try to remove build directory if it exists
if [ -d "dist" ]; then
    sudo rm -rf dist
fi
# try to remove /app/$REPO_NAME directory if it exists
if [ -d "/app/$REPO_NAME" ]; then
    sudo rm -rf /app/$REPO_NAME
fi

mkdir /app/$REPO_NAME
unzip artifact.zip -d dist
rm artifact.zip

# npm run deploy
mv dist/* /app/$REPO_NAME/
sudo systemctl restart nginx.service

echo "Latest artifact downloaded and extracted successfully!"
