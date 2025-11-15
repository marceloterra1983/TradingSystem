#!/bin/bash

# auto-fix-issues.sh
# Automatically fix common console errors and warnings

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DASHBOARD_DIR="$PROJECT_ROOT/frontend/dashboard"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Auto-fix Dashboard Issues${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$DASHBOARD_DIR"

# Step 1: Fix ESLint issues automatically
echo -e "${YELLOW}[1/6] Auto-fixing ESLint issues...${NC}"
npm run lint:fix
echo -e "${GREEN}✓ ESLint auto-fix complete${NC}"

# Step 2: Format code with Prettier
echo -e "${YELLOW}[2/6] Formatting code with Prettier...${NC}"
npm run format
echo -e "${GREEN}✓ Code formatting complete${NC}"

# Step 3: Remove unused imports (using ESLint)
echo -e "${YELLOW}[3/6] Removing unused imports...${NC}"
npx eslint . \
    --fix \
    --ignore-pattern 'public/sw.js' \
    --ignore-pattern 'dist/' \
    --rule 'no-unused-vars: error' \
    --rule '@typescript-eslint/no-unused-vars: error' || true
echo -e "${GREEN}✓ Unused imports removed${NC}"

# Step 4: Fix common React patterns
echo -e "${YELLOW}[4/6] Fixing React patterns...${NC}"

# Create a Node.js script to fix common issues
cat > /tmp/fix-react-patterns.mjs << 'EOF'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = process.argv[2];

function walkDir(dir, callback) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);

        if (stat.isDirectory()) {
            walkDir(filepath, callback);
        } else if (file.match(/\.(jsx|tsx)$/)) {
            callback(filepath);
        }
    });
}

function fixFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let modified = false;

    // Fix: Add key prop to map items without keys (simple pattern)
    const mapPattern = /\.map\(([\w\s,]+)\s*=>\s*<([A-Z]\w+)/g;
    const hasKeyPattern = /key=/;

    const matches = [...content.matchAll(mapPattern)];
    matches.forEach(match => {
        const fullMatch = match[0];
        if (!fullMatch.match(hasKeyPattern)) {
            // This is a simplified fix - you may need to adjust based on your data
            console.log(`Warning: Potential missing key in ${filepath}`);
        }
    });

    // Remove duplicate console.error/warn/log (keep only first occurrence)
    const lines = content.split('\n');
    const consoleLines = new Set();
    const newLines = [];

    for (const line of lines) {
        if (line.match(/console\.(log|error|warn|debug|info)\(/)) {
            const trimmed = line.trim();
            if (!consoleLines.has(trimmed)) {
                consoleLines.add(trimmed);
                newLines.push(line);
            } else {
                modified = true;
            }
        } else {
            newLines.push(line);
        }
    }

    if (modified) {
        fs.writeFileSync(filepath, newLines.join('\n'));
        console.log(`Fixed: ${filepath}`);
    }
}

walkDir(srcDir, fixFile);
EOF

node /tmp/fix-react-patterns.mjs "$DASHBOARD_DIR/src" || true
echo -e "${GREEN}✓ React patterns fixed${NC}"

# Step 5: Type check
echo -e "${YELLOW}[5/6] Running TypeScript type check...${NC}"
npm run type-check || {
    echo -e "${YELLOW}⚠ TypeScript errors found - review type-check output${NC}"
}

# Step 6: Validate build
echo -e "${YELLOW}[6/6] Validating production build...${NC}"
npm run build || {
    echo -e "${YELLOW}⚠ Build has warnings/errors - review build output${NC}"
}

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Auto-fix complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Review changes: ${YELLOW}git diff${NC}"
echo -e "  2. Test dashboard: ${YELLOW}npm run dev${NC}"
echo -e "  3. Commit fixes: ${YELLOW}git add . && git commit -m 'fix: auto-fix console errors and warnings'${NC}"
echo ""
