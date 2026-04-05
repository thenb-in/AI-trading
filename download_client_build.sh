#!/bin/bash

# Define repository details
# Get the GitHub remote URL (assumes "origin" remote)
REMOTE_URL=$(git config --get remote.origin.url)

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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_APP_NAME=$(node "$SCRIPT_DIR/scripts/ask-app-name.js" "$REMOTE_URL") || exit 1

# Prompt user for GitHub Token securely
read -p "Enter your GitHub Token for $GITHUB_OWNER/$GITHUB_REPO: " GITHUB_TOKEN
echo ""

# Fetch the latest successful workflow run ID (guard against null workflow_runs)
LATEST_RUN_ID=$(
  curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/actions/runs?status=success&branch=main&per_page=50" \
  | jq -r '(.workflow_runs // [])[] | select(.name=="Build and Upload Artifact") | .id' \
  | head -n1
)

# Check if a run was found
if [[ -z "$LATEST_RUN_ID" || "$LATEST_RUN_ID" == "null" ]]; then
    echo "No successful workflow runs found for 'Build and Upload Artifact' on branch main."
    echo "Check that the workflow has run successfully at least once on main."
    exit 1
fi

# Fetch full run details for deployment info
RUN_DETAILS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/actions/runs/$LATEST_RUN_ID")

if echo "$RUN_DETAILS" | jq -e '.message == "Not Found"' >/dev/null 2>&1; then
    echo "Workflow run $LATEST_RUN_ID not found. Token may lack permissions or run was deleted."
    exit 1
fi
if echo "$RUN_DETAILS" | jq -e '.created_at == null' >/dev/null 2>&1; then
    echo "Invalid response from GitHub API for run $LATEST_RUN_ID."
    exit 1
fi

BUILT_AT=$(echo "$RUN_DETAILS" | jq -r '.created_at')
HEAD_SHA=$(echo "$RUN_DETAILS" | jq -r '.head_sha')
HEAD_BRANCH=$(echo "$RUN_DETAILS" | jq -r '.head_branch')
COMMIT_MSG=$(echo "$RUN_DETAILS" | jq -r '.head_commit.message' | tr '\n' ' ' | sed 's/  */ /g')
COMMIT_AUTHOR=$(echo "$RUN_DETAILS" | jq -r '.head_commit.author.name')
SHORT_SHA="${HEAD_SHA:0:7}"

echo ""
echo "=============================================="
echo "  Artifact deployment details"
echo "=============================================="
echo "  Workflow run ID:  $LATEST_RUN_ID"
echo "  Built at:         $BUILT_AT"
echo "  Branch:           $HEAD_BRANCH"
echo "  Commit:           $SHORT_SHA ($HEAD_SHA)"
echo "  Commit message:   $COMMIT_MSG"
echo "  Author:           $COMMIT_AUTHOR"
echo "=============================================="
echo ""

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
# try to remove dist directory if it exists
if [ -d "dist" ]; then
    echo "Removing existing dist directory..."
    sudo rm -rf dist
fi
# try to remove /app/$DEPLOY_APP_NAME directory if it exists
if [ -d "/app/$DEPLOY_APP_NAME" ]; then
    echo "Removing existing app directory..."
    sudo rm -rf "/app/$DEPLOY_APP_NAME"
fi

mkdir "/app/$DEPLOY_APP_NAME"
unzip artifact.zip -d dist
rm artifact.zip

# npm run deploy
mv dist/* "/app/$DEPLOY_APP_NAME/"
sudo systemctl restart nginx.service

echo ""
echo "Deployment complete. Deployed artifact built at $BUILT_AT (commit $SHORT_SHA) at /app/$DEPLOY_APP_NAME."
