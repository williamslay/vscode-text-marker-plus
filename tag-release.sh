#!/usr/bin/env bash

set -euo pipefail

PRE_RELEASE=0
case "${1:-}" in
  '') ;;
  --pre) PRE_RELEASE=1 ;;
  *)
    printf 'Usage: %s [--pre]\n  --pre  tag the release as v<version>-pre so CI publishes it as a pre-release\n' "$0" >&2
    exit 1
    ;;
esac

RELEASE_VER="$(node -p 'require("./package.json").version')"

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "master" ]]; then
  printf 'Release must run from master; current branch: %s\n' "$CURRENT_BRANCH" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  printf '%s\n' 'Release requires a clean working tree.' >&2
  exit 1
fi

GIT_TAG_NAME="v$RELEASE_VER"
if [ "$PRE_RELEASE" -eq 1 ]; then
  GIT_TAG_NAME="$GIT_TAG_NAME-pre"
fi
git push origin master
git tag -a "$GIT_TAG_NAME" -m "$GIT_TAG_NAME"
git push origin "$GIT_TAG_NAME"
