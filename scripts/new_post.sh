#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 \"Post title\"" >&2
  exit 1
fi

title="$1"
slug="$(printf '%s' "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
date_stamp="$(date +%F)"
timestamp="$(date +'%F %H:%M:%S %z')"
post_path="_posts/${date_stamp}-${slug}.md"

cat > "$post_path" <<EOF
---
title: "$title"
date: $timestamp
categories: [security]
tags: [daily-note]
summary: "Add a one-sentence summary."
---

Write here.
EOF

echo "$post_path"
