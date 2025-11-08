#!/usr/bin/env bash
# Automated Table of Contents Generator
# Generates TOC for markdown files > 300 lines

set -euo pipefail

DOCS_DIR="${1:-docs/content}"
DRY_RUN="${2:-false}"

generate_toc() {
    local file="$1"
    local temp_toc=$(mktemp)

    echo "## Table of Contents" > "$temp_toc"
    echo "" >> "$temp_toc"

    # Extract headings (## and ###)
    grep -E "^##+ " "$file" | while read -r heading; do
        # Remove markdown heading syntax
        local level=$(echo "$heading" | grep -o "^#*" | tr -d '\n' | wc -c)
        local text=$(echo "$heading" | sed 's/^#* //')

        # Generate anchor link (lowercase, replace spaces with hyphens, remove special chars)
        local anchor=$(echo "$text" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 -]//g' | tr ' ' '-')

        # Create TOC entry with proper indentation
        local indent=""
        for ((i=2; i<level; i++)); do
            indent="  ${indent}"
        done

        echo "${indent}- [${text}](#${anchor})" >> "$temp_toc"
    done

    cat "$temp_toc"
    rm "$temp_toc"
}

process_file() {
    local file="$1"
    local lines=$(wc -l < "$file")

    if [[ $lines -lt 300 ]]; then
        return
    fi

    # Check if TOC already exists
    if grep -qi "table of contents\|^## Contents" "$file"; then
        echo "⏭️  Skipped: $(basename "$file") (already has TOC)"
        return
    fi

    echo "📝 Processing: $(basename "$file") ($lines lines)"

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "   [DRY RUN] Would add TOC to this file"
        return
    fi

    # Generate TOC
    local toc=$(generate_toc "$file")

    # Find insertion point (after frontmatter if exists, otherwise after first heading)
    local temp_file=$(mktemp)

    # Check if file has frontmatter
    if head -n 1 "$file" | grep -q "^---$"; then
        # File has frontmatter - insert TOC after it
        awk '
        BEGIN { in_frontmatter=0; frontmatter_done=0; toc_inserted=0 }
        /^---$/ {
            if (in_frontmatter == 0) {
                in_frontmatter = 1
                print
                next
            } else {
                frontmatter_done = 1
                print
                print ""
                print "'"$toc"'"
                print ""
                toc_inserted = 1
                next
            }
        }
        { print }
        ' "$file" > "$temp_file"
    else
        # No frontmatter - insert after first heading
        awk '
        BEGIN { first_heading_found=0 }
        /^# / {
            if (first_heading_found == 0) {
                print
                print ""
                print "'"$toc"'"
                print ""
                first_heading_found = 1
                next
            }
        }
        { print }
        ' "$file" > "$temp_file"
    fi

    # Replace original file
    mv "$temp_file" "$file"
    echo "   ✅ Added TOC"
}

# Main execution
echo "Automated Table of Contents Generator"
echo "======================================"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    echo "🔍 DRY RUN MODE - No files will be modified"
    echo ""
fi

find "$DOCS_DIR" -type f \( -name "*.md" -o -name "*.mdx" \) | while read -r file; do
    process_file "$file"
done

echo ""
echo "✅ TOC generation complete"
