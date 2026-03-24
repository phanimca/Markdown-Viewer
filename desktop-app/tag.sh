#!/bin/bash
set -euo pipefail

echo ""
echo "@tag.sh - Utility script to calculate the next tag for the desktop app"
echo "---"

DEFAULT_VERSION="$(date +"%Y.%-m.0")"
DEFAULT_TAG_NAME="desktop-v$DEFAULT_VERSION"

# Get the latest tag for the current branch and prune deleted tags
TAG_NAME=$(git fetch --tags --prune --prune-tags && git tag -l --contains HEAD | tail -n1)

# If no tag is found, create one using CalVer (Calendar Versioning)
if [ -z "$TAG_NAME" ]; then
    echo "[WARNING] No tag found, creating one using CalVer (Calendar Versioning)"
    # Use CalVer (Calendar Versioning) 
    # format: YYYY.M.P 
    # YYYY = Year, M = Month, P = Patch (Defaults to 0 if not specified)
    # Example: 2026.2.0
    TAG_NAME="$DEFAULT_TAG_NAME"

else # If a tag is found, determine the next tag
    # Remove "desktop-v" prefix
    TAG_NAME=${TAG_NAME#desktop-v}

    # Check if not from current month or year
    if [ "$(echo "$TAG_NAME" | awk -F. '{print $2}')" != "$(date +"%-m")" ] || [ "$(echo "$TAG_NAME" | awk -F. '{print $1}')" != "$(date +"%Y")" ]; then
        # Reset patch to 0 and set YYYY.M to current date
        TAG_NAME="$DEFAULT_VERSION"
    else
        # Same month & year => only increment the patch number
        TAG_NAME=$(echo "$TAG_NAME" | awk -F. '{$NF = $NF + 1; OFS="."; print}')
    fi
    # Add "desktop-v" prefix back
    TAG_NAME="desktop-v$TAG_NAME"
fi

# Get the current short commit-hash
COMMIT_HASH=$(git show -s --format=%h)

# Print the tag and commit-hash
echo "TAG "$'\t'""$'\t '" | COMMIT"
echo "----------------- | --------"
echo "$TAG_NAME | $COMMIT_HASH"
echo ""
echo "To create and push the tag, run:"
echo "git tag \"$TAG_NAME\" && git push origin \"$TAG_NAME\""
