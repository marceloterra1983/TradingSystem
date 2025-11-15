#!/bin/bash

# Script para encontrar .map() sem key prop

cd /workspace/frontend/dashboard/src

echo "Procurando por .map() sem key prop..."
echo ""

# Procura por padrões .map() seguidos de JSX sem key=
grep -rn "\.map(" . --include="*.tsx" --include="*.jsx" -A 3 | \
    awk '
    /\.map\(/ {
        mapLine = $0
        inMap = 1
        hasKey = 0
        lineCount = 0
        next
    }
    inMap {
        lineCount++
        if (/key=/) {
            hasKey = 1
        }
        if (/<[A-Z]/ && !hasKey && lineCount <= 3) {
            print mapLine
            print $0
            print "---"
        }
        if (lineCount >= 3) {
            inMap = 0
        }
    }
    ' | head -50
