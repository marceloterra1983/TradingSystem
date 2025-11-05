#!/bin/bash
# Fix MDX less-than symbol errors
# Usage: bash scripts/docs/fix-mdx-less-than.sh

echo "🔧 Fixing MDX less-than symbol errors..."

# File 1: validation-guide.mdx
sed -i 's/(\(<[0-9]\+\s*[a-z]*\))/(under \1)/g; s/under </</' \
    /home/marce/Projetos/TradingSystem/docs/content/governance/validation-guide.mdx

# File 2: All technical-debt-tracker occurrences
sed -i 's/(<1s)/(under 1s)/g' \
    /home/marce/Projetos/TradingSystem/docs/content/governance/technical-debt-tracker.mdx

# File 3: automated-maintenance-guide.mdx
sed -i 's/<50 words/under 50 words/g; s/<3 days/under 3 days/g; s/<2 weeks/under 2 weeks/g; s/<1 month/under 1 month/g; s/<5%/under 5%/g; s/<60 days/under 60 days/g' \
    /home/marce/Projetos/TradingSystem/docs/content/governance/automated-maintenance-guide.mdx

# File 4: maintenance-checklist.mdx  
sed -i 's/<30,/under 30,/g; s/<30 seconds/under 30 seconds/g; s/<90 days/under 90 days/g; s/>80%/above 80%/g; s/<5%/under 5%/g; s/<10/under 10/g; s/<120/under 120/g; s/>90 days/above 90 days/g' \
    /home/marce/Projetos/TradingSystem/docs/content/governance/maintenance-checklist.mdx

# File 5: standards/secrets-standard.mdx
sed -i 's/<2h/under 2h/g' \
    /home/marce/Projetos/TradingSystem/docs/content/governance/standards/secrets-standard.mdx

# File 6: ADR-005
sed -i 's/`<2min`/`under 2min`/g; s/`<3min`/`under 3min`/g; s/`<4min`/`under 4min`/g; s/`<5min`/`under 5min`/g; s/`<10min`/`under 10min`/g; s/`<5%`/`under 5%`/g; s/`<3%`/`under 3%`/g; s/`<2%`/`under 2%`/g; s/`<1%`/`under 1%`/g' \
    /home/marce/Projetos/TradingSystem/docs/content/reference/adrs/ADR-005-test-coverage-strategy.md

# File 7: telegram-gateway migration
sed -i 's/target: <15ms/target: under 15ms/g; s/target: <80%/target: under 80%/g' \
    /home/marce/Projetos/TradingSystem/docs/content/apps/telegram-gateway/migration-runbook.mdx

# File 8: ADR-003
sed -i 's/`<10ms`/`under 10ms`/g; s/`<100ms`/`under 100ms`/g; s/`<210ms`/`under 210ms`/g; s/`<1%`/`under 1%`/g' \
    /home/marce/Projetos/TradingSystem/docs/content/reference/adrs/ADR-003-api-gateway-implementation.md

# File 9: algolia-setup-guide
sed -i 's/`<200ms`/`under 200ms`/g' \
    /home/marce/Projetos/TradingSystem/docs/content/tools/documentation/docusaurus/algolia-setup-guide.md

echo "✅ Fixed all MDX less-than symbol errors!"
echo ""
echo "Files modified:"
echo "  - governance/validation-guide.mdx"
echo "  - governance/technical-debt-tracker.mdx"
echo "  - governance/automated-maintenance-guide.mdx"
echo "  - governance/maintenance-checklist.mdx"
echo "  - governance/standards/secrets-standard.mdx"
echo "  - reference/adrs/ADR-005-test-coverage-strategy.md"
echo "  - apps/telegram-gateway/migration-runbook.mdx"
echo "  - reference/adrs/ADR-003-api-gateway-implementation.md"
echo "  - tools/documentation/docusaurus/algolia-setup-guide.md"

