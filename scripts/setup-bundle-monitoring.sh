#!/bin/bash

# Bundle Size Monitoring Setup Script
# Initializes CI/CD monitoring for bundle sizes

set -e

echo "🔧 Setting up Bundle Size Monitoring..."
echo ""

# Check if we're in the project root
if [ ! -f "package.json" ] || [ ! -d "frontend/dashboard" ]; then
  echo "❌ Error: Please run this script from the project root"
  exit 1
fi

# 1. Setup Husky (pre-commit hooks)
echo "📦 Step 1/4: Setting up Husky..."
cd frontend/dashboard

if [ ! -d ".husky" ]; then
  echo "  Installing Husky..."
  npm install --save-dev husky
  npx husky install
  echo "  ✅ Husky installed"
else
  echo "  ℹ️  Husky already installed"
fi

# Make pre-commit executable
if [ -f ".husky/pre-commit" ]; then
  chmod +x .husky/pre-commit
  echo "  ✅ Pre-commit hook configured"
else
  echo "  ⚠️  Pre-commit hook not found at .husky/pre-commit"
  echo "  Creating basic pre-commit hook..."

  cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Bundle Size Check (Frontend Dashboard)
if git diff --cached --name-only | grep -q "^frontend/dashboard/"; then
  echo "📦 Checking bundle size..."

  cd frontend/dashboard || exit 1
  npm run build > /dev/null 2>&1

  if npm run check:bundle:size > /dev/null 2>&1; then
    echo "✅ Bundle size check passed"
  else
    echo ""
    echo "❌ Bundle size check failed!"
    echo "Run 'npm run check:bundle:size' to see details"
    exit 1
  fi

  cd - > /dev/null || exit 1
fi
EOF

  chmod +x .husky/pre-commit
  echo "  ✅ Pre-commit hook created"
fi

cd ../..

# 2. Verify GitHub Actions workflows
echo ""
echo "📋 Step 2/4: Verifying GitHub Actions workflows..."

if [ -f ".github/workflows/bundle-size-check.yml" ]; then
  echo "  ✅ bundle-size-check.yml found"
else
  echo "  ⚠️  bundle-size-check.yml not found"
fi

if [ -f ".github/workflows/bundle-monitoring.yml" ]; then
  echo "  ✅ bundle-monitoring.yml found"
else
  echo "  ⚠️  bundle-monitoring.yml not found"
fi

# 3. Verify bundle size budgets
echo ""
echo "💰 Step 3/4: Verifying bundle size budgets..."

if [ -f "frontend/dashboard/scripts/bundle-size-budgets.json" ]; then
  echo "  ✅ bundle-size-budgets.json found"

  # Validate JSON
  if cat frontend/dashboard/scripts/bundle-size-budgets.json | jq . > /dev/null 2>&1; then
    echo "  ✅ Budget file is valid JSON"
  else
    echo "  ⚠️  Budget file has invalid JSON"
  fi
else
  echo "  ❌ bundle-size-budgets.json not found"
fi

if [ -f "frontend/dashboard/scripts/check-bundle-size.mjs" ]; then
  chmod +x frontend/dashboard/scripts/check-bundle-size.mjs
  echo "  ✅ check-bundle-size.mjs found and made executable"
else
  echo "  ❌ check-bundle-size.mjs not found"
fi

# 4. Test bundle size check
echo ""
echo "🧪 Step 4/4: Testing bundle size check..."

cd frontend/dashboard

echo "  Building production bundle..."
if npm run build > /dev/null 2>&1; then
  echo "  ✅ Build successful"

  echo "  Running bundle size check..."
  if npm run check:bundle:size > /dev/null 2>&1; then
    echo "  ✅ Bundle size check passed"
  else
    echo "  ⚠️  Bundle size check failed (budgets may need adjustment)"
    echo "  Run 'npm run check:bundle:size' to see details"
  fi
else
  echo "  ❌ Build failed"
  echo "  Fix build errors before proceeding"
  cd ../..
  exit 1
fi

cd ../..

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Bundle Size Monitoring Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 What's configured:"
echo ""
echo "  1. Pre-commit Hook"
echo "     ↳ Checks bundle size before every commit"
echo "     ↳ Location: frontend/dashboard/.husky/pre-commit"
echo ""
echo "  2. Pull Request Check"
echo "     ↳ Validates bundle size on every PR"
echo "     ↳ Workflow: .github/workflows/bundle-size-check.yml"
echo ""
echo "  3. Weekly Monitoring"
echo "     ↳ Tracks bundle size trends"
echo "     ↳ Workflow: .github/workflows/bundle-monitoring.yml"
echo "     ↳ Schedule: Every Monday at 9 AM UTC"
echo ""
echo "📚 Documentation:"
echo "     frontend/dashboard/docs/BUNDLE-CI-CD.md"
echo ""
echo "🧪 Test locally:"
echo "     cd frontend/dashboard"
echo "     npm run build"
echo "     npm run check:bundle:size"
echo ""
echo "🚀 Next steps:"
echo "     1. Commit the changes"
echo "     2. Push to GitHub"
echo "     3. Create a PR to test the workflow"
echo ""
