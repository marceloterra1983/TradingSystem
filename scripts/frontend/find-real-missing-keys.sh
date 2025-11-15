#!/bin/bash

# Find REAL missing keys in .map() - not false positives

set -e

DASHBOARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../frontend/dashboard" && pwd)"
SRC_DIR="$DASHBOARD_DIR/src"

echo "Searching for REAL missing keys in .map()..."
echo ""

# Use a more sophisticated grep that checks for JSX elements without key prop
# This script looks for .map(() => <Element without key

grep -rn "\.map(" "$SRC_DIR" --include="*.tsx" --include="*.jsx" -A 3 | \
  awk '
    BEGIN { in_map = 0; map_line = ""; jsx_line = ""; file = ""; line_num = 0 }

    # Detect start of .map()
    /\.map\(/ {
      in_map = 1
      map_line = $0
      file = $1
      line_num = $2
      next
    }

    # Inside .map(), look for JSX opening tags
    in_map && /<[A-Z][a-zA-Z0-9]*/ {
      jsx_line = $0
      # Check if this JSX line contains key=
      if (!/key=/) {
        # Also check if it might be a self-closing tag or continuation
        if (!/\/>$/ && !/key=/) {
          print "Potential missing key:"
          print map_line
          print jsx_line
          print "---"
        }
      }
      in_map = 0
      next
    }

    # Reset after 3 lines
    in_map { line_count++ }
    line_count > 3 { in_map = 0; line_count = 0 }
  ' | grep -E "\.map\(|<[A-Z]|---" | head -50

echo ""
echo "Done. Check output above for real issues."
