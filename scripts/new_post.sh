#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 \"Post title\" [news|articles|skills]" >&2
  echo "  lane defaults to 'news' (skills = a Track post)" >&2
  exit 1
fi

title="$1"
lane="${2:-news}"

case "$lane" in
  news|articles|skills) ;;
  tracks|track) lane="skills" ;;
  article) lane="articles" ;;
  *)
    echo "error: lane must be one of news | articles | skills" >&2
    exit 1
    ;;
esac

slug="$(printf '%s' "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
date_stamp="$(date +%F)"
timestamp="$(date +'%F %H:%M:%S %z')"
post_path="_posts/${date_stamp}-${slug}.md"

cat > "$post_path" <<EOF
---
title: "$title"
date: $timestamp
categories: [$lane]
tags: [tag-one, tag-two]
summary: "Add a one-sentence summary that states the operator-relevant thesis."
---

Write here.
EOF

echo "$post_path"
