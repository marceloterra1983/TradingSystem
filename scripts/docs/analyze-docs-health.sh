#!/bin/bash
# Documentation Health Analysis Script
# Part of: Phase 1.6 - Documentation Consolidation (Improvement Plan v1.0)

set -e

DOCS_DIR="${1:-docs/content}"
REPORT_FILE="${2:-docs/DOCS-HEALTH-REPORT.md}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📚 TradingSystem Documentation Health Analysis${NC}"
echo "=============================================="
echo ""

# Initialize counters
TOTAL_FILES=0
FILES_WITH_FRONTMATTER=0
FILES_WITHOUT_FRONTMATTER=0
BROKEN_LINKS=0
TODO_ITEMS=0
OUTDATED_DOCS=0

# Start report
cat > "$REPORT_FILE" << 'EOF'
# 📚 Documentation Health Report

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Analyzed Directory:** docs/content

## 📊 Summary Statistics

EOF

# Count total documentation files
echo -e "${BLUE}1. Counting documentation files...${NC}"
TOTAL_FILES=$(find "$DOCS_DIR" -type f \( -name "*.md" -o -name "*.mdx" \) | wc -l)
echo -e "   Total files: ${GREEN}$TOTAL_FILES${NC}"

# Check frontmatter
echo -e "\n${BLUE}2. Checking frontmatter...${NC}"
FILES_WITH_FRONTMATTER=$(find "$DOCS_DIR" -type f \( -name "*.md" -o -name "*.mdx" \) -exec grep -l "^---$" {} \; 2>/dev/null | wc -l)
FILES_WITHOUT_FRONTMATTER=$((TOTAL_FILES - FILES_WITH_FRONTMATTER))
echo -e "   With frontmatter: ${GREEN}$FILES_WITH_FRONTMATTER${NC}"
echo -e "   Without frontmatter: ${YELLOW}$FILES_WITHOUT_FRONTMATTER${NC}"

# Find files without frontmatter
if [ $FILES_WITHOUT_FRONTMATTER -gt 0 ]; then
    echo -e "\n${YELLOW}   Files missing frontmatter:${NC}"
    find "$DOCS_DIR" -type f \( -name "*.md" -o -name "*.mdx" \) -exec grep -L "^---$" {} \; 2>/dev/null | head -10 | while read -r file; do
        echo -e "     - ${file#$DOCS_DIR/}"
    done
fi

# Check for TODO/FIXME items
echo -e "\n${BLUE}3. Checking for TODO/FIXME items...${NC}"
TODO_ITEMS=$(find "$DOCS_DIR" -type f \( -name "*.md" -o -name "*.mdx" \) -exec grep -i "TODO\|FIXME\|XXX" {} \; 2>/dev/null | wc -l)
echo -e "   TODO/FIXME items: ${YELLOW}$TODO_ITEMS${NC}"

# Check for broken internal links (basic check)
echo -e "\n${BLUE}4. Checking internal links...${NC}"
echo -e "   ${YELLOW}(Running basic check - use npm run docs:links for comprehensive check)${NC}"

# Count directories
echo -e "\n${BLUE}5. Directory structure...${NC}"
TOTAL_DIRS=$(find "$DOCS_DIR" -type d | wc -l)
echo -e "   Total directories: ${GREEN}$TOTAL_DIRS${NC}"

# Top-level categories
echo -e "\n${BLUE}6. Top-level categories:${NC}"
find "$DOCS_DIR" -maxdepth 1 -type d | tail -n +2 | while read -r dir; do
    COUNT=$(find "$dir" -type f \( -name "*.md" -o -name "*.mdx" \) | wc -l)
    echo -e "   - $(basename "$dir"): ${GREEN}$COUNT files${NC}"
done

# Generate detailed report
cat >> "$REPORT_FILE" << EOF

| Metric | Count | Status |
|--------|-------|--------|
| **Total Files** | $TOTAL_FILES | ✅ |
| **With Frontmatter** | $FILES_WITH_FRONTMATTER | $([ $FILES_WITH_FRONTMATTER -eq $TOTAL_FILES ] && echo "✅" || echo "⚠️") |
| **Without Frontmatter** | $FILES_WITHOUT_FRONTMATTER | $([ $FILES_WITHOUT_FRONTMATTER -eq 0 ] && echo "✅" || echo "⚠️") |
| **TODO/FIXME Items** | $TODO_ITEMS | $([ $TODO_ITEMS -lt 10 ] && echo "✅" || echo "⚠️") |
| **Total Directories** | $TOTAL_DIRS | ✅ |

## 📁 Top-Level Categories

| Category | Files |
|----------|-------|
EOF

find "$DOCS_DIR" -maxdepth 1 -type d | tail -n +2 | while read -r dir; do
    COUNT=$(find "$dir" -type f \( -name "*.md" -o -name "*.mdx" \) | wc -l)
    echo "| $(basename "$dir") | $COUNT |" >> "$REPORT_FILE"
done

# Issues section
cat >> "$REPORT_FILE" << EOF

## ⚠️ Issues Found

### Files Without Frontmatter

EOF

if [ $FILES_WITHOUT_FRONTMATTER -gt 0 ]; then
    find "$DOCS_DIR" -type f \( -name "*.md" -o -name "*.mdx" \) -exec grep -L "^---$" {} \; 2>/dev/null | head -20 | while read -r file; do
        echo "- \`${file#$DOCS_DIR/}\`" >> "$REPORT_FILE"
    done
else
    echo "✅ No issues found" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << EOF

### TODO/FIXME Items

EOF

if [ $TODO_ITEMS -gt 0 ]; then
    find "$DOCS_DIR" -type f \( -name "*.md" -o -name "*.mdx" \) -exec grep -Hn "TODO\|FIXME\|XXX" {} \; 2>/dev/null | head -20 | while read -r line; do
        FILE=$(echo "$line" | cut -d: -f1)
        LINE_NUM=$(echo "$line" | cut -d: -f2)
        CONTENT=$(echo "$line" | cut -d: -f3-)
        echo "- \`${FILE#$DOCS_DIR/}:$LINE_NUM\`: $CONTENT" >> "$REPORT_FILE"
    done
else
    echo "✅ No TODO/FIXME items found" >> "$REPORT_FILE"
fi

# Recommendations
cat >> "$REPORT_FILE" << 'EOF'

## 💡 Recommendations

### High Priority

1. **Add Frontmatter** - Add YAML frontmatter to all documentation files
   ```yaml
   ---
   title: Page Title
   sidebar_position: 1
   tags: [tag1, tag2]
   ---
   ```

2. **Resolve TODO Items** - Address pending TODO/FIXME items
3. **Validate Links** - Run `npm run docs:links` for comprehensive link checking

### Medium Priority

1. **Organize Categories** - Ensure logical grouping of documentation
2. **Update Outdated Docs** - Review and update docs with old dates
3. **Add Missing Docs** - Fill documentation gaps

### Low Priority

1. **Improve Navigation** - Add category index pages
2. **Add Examples** - Include code examples and screenshots
3. **Cross-Reference** - Add links between related docs

## 🔄 Next Steps

1. Review this report
2. Create issues for high-priority items
3. Run `npm run docs:check` for comprehensive validation
4. Run `npm run docs:links` for link checking

---

**Report Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Script:** scripts/docs/analyze-docs-health.sh
EOF

echo -e "\n${GREEN}✅ Analysis complete!${NC}"
echo -e "\n${BLUE}📄 Report saved to: ${GREEN}$REPORT_FILE${NC}"
echo -e "\n${BLUE}💡 To view:${NC} cat $REPORT_FILE | less"
echo -e "${BLUE}💡 To fix frontmatter:${NC} python3 scripts/docs/validate-frontmatter.py --fix"
echo -e "${BLUE}💡 To check links:${NC} npm run docs:links\n"
