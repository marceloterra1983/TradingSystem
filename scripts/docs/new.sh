#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

usage() {
  cat <<'EOF'
Usage: scripts/docs/new.sh <section/path> [--title "My Title"] [--description "Summary"] [--tag tag1,tag2]

Examples:
  scripts/docs/new.sh playbooks/fix-service --title "Fix Service" --description "Runbook placeholder" --tag operations,playbooks
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

TARGET=""
TITLE="TODO Title"
DESCRIPTION="TODO description"
TAGS="todo"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      TITLE="${2:-${TITLE}}"
      shift 2
      ;;
    --description)
      DESCRIPTION="${2:-${DESCRIPTION}}"
      shift 2
      ;;
    --tag|--tags)
      TAGS="${2:-${TAGS}}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      if [[ -z "${TARGET}" ]]; then
        TARGET="$1"
      else
        echo "Unexpected argument: $1" >&2
        usage
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "${TARGET}" ]]; then
  echo "Missing target path" >&2
  usage
  exit 1
fi

TARGET="${TARGET%.mdx}"
TARGET="${TARGET%.md}"

FILE_PATH="${DOCS_DIR}/content/${TARGET}.mdx"
DIR_PATH="$(dirname "${FILE_PATH}")"

if [[ -e "${FILE_PATH}" ]]; then
  echo "File already exists at ${FILE_PATH}" >&2
  exit 1
fi

mkdir -p "${DIR_PATH}"

IFS=',' read -ra TAG_ARRAY <<<"${TAGS}"
TAG_LINES=""
for tag in "${TAG_ARRAY[@]}"; do
  TAG_LINES+="  - ${tag}"$'\n'
done

cat > "${FILE_PATH}" <<EOF
---
title: ${TITLE}
description: ${DESCRIPTION}
tags:
${TAG_LINES}owner: TODO
---

## Overview

Describe the purpose of this document.

## Details

- Add context, steps, and references here.
EOF

echo "Created ${FILE_PATH}"
