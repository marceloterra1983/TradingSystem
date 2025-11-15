# Dashboard Console Errors - Comprehensive Report
Generated: Sat Nov 15 14:10:14 -03 2025

## Summary

This report identifies all console warnings and errors in the dashboard.

## 1. ESLint Issues

```

/workspace/frontend/dashboard/vite.config.js
   89:11  warning  'dbUiQuestDbProxy' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars
   94:11  warning  'n8nBasePath' is assigned a value but never used. Allowed unused vars must match /^_/u       no-unused-vars
  373:54  warning  'res' is defined but never used. Allowed unused args must match /^_/u                        no-unused-vars

✖ 3 problems (0 errors, 3 warnings)
```

Full report: [eslint-report-20251115_140954.txt](./eslint-report-20251115_140954.txt)

## 2. Unused Imports

```

Oops! Something went wrong! :(

ESLint: 8.57.1

TypeError: Key "rules": Key "@typescript-eslint/no-unused-vars": Could not find plugin "@typescript-eslint".
    at throwRuleNotFoundError (/workspace/frontend/dashboard/node_modules/eslint/lib/config/rule-validator.js:66:11)
    at RuleValidator.validate (/workspace/frontend/dashboard/node_modules/eslint/lib/config/rule-validator.js:128:17)
    at [finalizeConfig] (/workspace/frontend/dashboard/node_modules/eslint/lib/config/flat-config-array.js:337:23)
    at FlatConfigArray.getConfig (/workspace/frontend/dashboard/node_modules/@humanwhocodes/config-array/api.js:1036:55)
    at FlatConfigArray.isFileIgnored (/workspace/frontend/dashboard/node_modules/@humanwhocodes/config-array/api.js:1060:15)
    at /workspace/frontend/dashboard/node_modules/eslint/lib/eslint/eslint-helpers.js:336:57
    at Array.reduce (<anonymous>)
    at /workspace/frontend/dashboard/node_modules/eslint/lib/eslint/eslint-helpers.js:323:36
    at /workspace/frontend/dashboard/node_modules/eslint/lib/eslint/eslint-helpers.js:286:32
    at Object.isAppliedFilter (/workspace/frontend/dashboard/node_modules/@nodelib/fs.walk/out/readers/common.js:12:31)
```

## 3. React Anti-patterns

```
# React Anti-patterns Found:

## Missing Keys in Lists
src/contexts/TradingContext.tsx:125:      const updatedPositions = portfolio.positions.map((position) =>
src/components/history/JobStatistics.tsx:176:                      {statusData.map((entry, index) => (
src/components/history/JobStatistics.tsx:204:                      {typeData.map((entry, index) => (
src/components/history/ResultsComparison.tsx:258:              {comparableValues.map((item) => (
src/components/history/ResultsComparison.tsx:359:                {diffResult?.chunks.map((chunk, index) => {
src/components/trading/TradingList.tsx:30:        {Array.from({ length: 6 }).map((_, index) => (
src/components/trading/TradingList.tsx:105:      {data.map((tradingData) => (
src/components/catalog/__tests__/AgentsCatalogView.test.tsx:28:      {sections.map((section) => (
src/components/catalog/AgentsCatalogView.tsx:66:  const existing = new Set<string>(agents.map((agent) => agent.category));
src/components/catalog/AgentsCatalogView.tsx:303:                      {categories.map((category) => (
src/components/catalog/AgentsCatalogView.tsx:320:                      {tagOptions.map((tag) => (
src/components/catalog/AgentsCatalogView.tsx:371:                    {filteredAgents.map((agent) => {
src/components/catalog/AgentsCatalogView.tsx:461:                              {agentTags.map((tag) => (
src/components/catalog/AgentsCatalogView.tsx:550:                          {categories.map((category) => (
src/components/catalog/AgentsCatalogView.tsx:570:                          {tagOptions.map((tag) => (
src/components/catalog/AgentsCatalogView.tsx:682:                      {filteredAgents.map((agent) => {
src/components/catalog/AgentsCatalogView.tsx:735:                                {agentTags.map((tag) => (
src/components/catalog/AgentsCommandsCatalogView.tsx:99:    return AI_AGENTS_DIRECTORY.map((agent) => ({
src/components/catalog/AgentsCommandsCatalogView.tsx:117:    return commandsDatabase.commands.map((cmd) => ({
src/components/catalog/AgentsCommandsCatalogView.tsx:140:      new Set(allEntries.map((item) => item.category).filter(Boolean)),
src/components/catalog/AgentsCommandsCatalogView.tsx:352:                      {categories.map((category) => (
src/components/catalog/AgentsCommandsCatalogView.tsx:369:                      {tagOptions.map((tag) => (
src/components/catalog/AgentsCommandsCatalogView.tsx:417:                    {filteredEntries.map((entry) => {
src/components/catalog/AgentsCommandsCatalogView.tsx:485:                                    .map((ex, idx) => (
src/components/catalog/AgentsCommandsCatalogView.tsx:504:                              {entry.tags.map((tag, idx) => (
src/components/catalog/CommandsCatalogView.tsx:102:        ALL_COMMANDS.map((item) => item.category).filter(
src/components/catalog/CommandsCatalogView.tsx:374:                      {categories.map((category) => (
src/components/catalog/CommandsCatalogView.tsx:391:                      {tagOptions.map((tag) => (
src/components/catalog/CommandsCatalogView.tsx:441:                    {filteredCommands.map((command) => (
src/components/catalog/CommandsCatalogView.tsx:504:                            {command.exemplos.map((example) => (
src/components/catalog/CommandsCatalogView.tsx:529:                            {command.tags.map((tag) => (
src/components/catalog/CommandsCatalogView.tsx:628:                          {categories.map((category) => (
src/components/catalog/CommandsCatalogView.tsx:648:                          {tagOptions.map((tag) => (
src/components/catalog/CommandsCatalogView.tsx:774:                        {filteredCommands.map((command) => (
src/components/catalog/CommandsCatalogView.tsx:839:                                {(command.tags ?? []).map((tag) => (
src/components/catalog/CommandsCatalogView.tsx:853:                                  ? command.exemplos.map((example) => (
src/components/ui/button-with-dropdown.tsx:122:            {options.map((option) => (
src/components/ui/toast.tsx:82:      {toasts.map((toast) => (
src/components/ui/PageLoadingSpinner.tsx:54:        {[1, 2, 3, 4, 5, 6].map((i) => (
src/components/ui/collapsible-card.tsx:84:        {Children.map(children, (child) => {
src/components/layout/CustomizablePageLayout.tsx:50:    componentIds: sections.map((s) => s.id),
src/components/layout/PageContent.tsx:124:          {parts.map((part) => (
src/components/layout/DraggableGridLayout.tsx:255:  const items = components.map((c) => c.id);
src/components/layout/DraggableGridLayout.tsx:289:          {components.map((component, index) => (
src/components/layout/LayoutControls.tsx:82:        {COLUMN_OPTIONS.map((option, index) => {
src/components/layout/LayoutSidebar.tsx:41:      return new Set(NAVIGATION_DATA.map((section) => section.id));
src/components/layout/LayoutSidebar.tsx:139:          {NAVIGATION_DATA.map((section) => (
```

## 4. TypeScript Errors

```

> documentation-dashboard@1.2.0 type-check
> tsc --noEmit
```

## 5. Hardcoded URLs (CORS Issues)

```
src/__tests__/components/DocsHybridSearchPage.spec.tsx:48:  resolveDocsPreviewUrl: (url: string) => `http://localhost:9080${url}`,
src/components/pages/DocusaurusPage.tsx:26:    const parsed = new URL(value, "http://localhost");
src/components/pages/ConnectionsPageNew.tsx:21:  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9080';
src/components/pages/ConnectionsPageNew.tsx:179:      check: "curl http://localhost:3402/health",
src/components/pages/URLsPage.tsx:81:        { name: "Firecrawl", url: "http://localhost:3002" },
src/components/pages/URLsPage.tsx:83:        { name: "Agent MCP Dashboard", url: "http://localhost:8080" },
src/components/pages/URLsPage.tsx:106:          url: "http://localhost:8084",
src/components/pages/URLsPage.tsx:153:        { name: "Swagger / OpenAPI UI", url: "http://localhost:8200/docs" },
src/components/pages/N8nPage.tsx:21:  const baseUrl = env.VITE_N8N_URL || "http://localhost:3680";
src/components/pages/CourseCrawlerPage.tsx:7:const DEFAULT_DIRECT_URL = "http://localhost:4201";
src/components/pages/MCPControlPage.tsx:7:        src="http://localhost:3847/"
src/components/pages/KestraPage.tsx:4:const DEFAULT_KESTRA_HTTP_URL = "http://localhost:9080/kestra";
```

## 6. Console Statements

```
src/main.tsx:11:    console.log("[PWA] Service worker active:", registration.scope);
src/main.tsx:14:    console.log("[PWA] New version available");
src/main.tsx:18:    console.error("[PWA] Service worker error:", error);
src/components/catalog/AgentsCatalogView.tsx:216:      console.error("Clipboard API indisponível.");
src/components/catalog/AgentsCatalogView.tsx:222:      console.error("Falha ao copiar nome do agente.", error);
src/components/catalog/CommandsCatalogView.tsx:240:        console.error("Failed to copy text", error);
src/components/ui/logo.tsx:104:        console.error("Logo failed to load:", logoSrc);
src/components/layout/PageContent.tsx:33:      console.error("Page content failed to load", error, errorInfo);
src/components/layout/LayoutHeader.tsx:41:      console.error("Failed to copy URL:", error);
src/components/pages/DocsHybridSearchPage.tsx:212:    console.error("[DocsSearch] Failed to persist key", { key, error });
src/components/pages/DocsHybridSearchPage.tsx:223:    console.error("[DocsSearch] Failed to remove key", { key, error });
src/components/pages/DocsHybridSearchPage.tsx:269:    console.warn("[DocsSearch] Stored results malformed, resetting cache");
src/components/pages/DocsHybridSearchPage.tsx:272:    console.error("[DocsSearch] Failed to parse cached results", error);
src/components/pages/DocusaurusPage.tsx:121:  console.log("[DocusaurusPage] activeView:", activeView);
src/components/pages/DocusaurusPage.tsx:122:  console.log("[DocusaurusPage] iframeSrc:", iframeSrc);
src/components/pages/DocusaurusPage.tsx:123:  console.log("[DocusaurusPage] DEV mode:", import.meta.env.DEV);
src/components/pages/DocusaurusPage.tsx:157:    console.log("[DocusaurusPage] Changing view to:", view);
src/components/pages/DocusaurusPage.tsx:267:                console.log("[DocusaurusPage] Iframe carregado com sucesso")
src/components/pages/DocusaurusPage.tsx:270:                console.error("[DocusaurusPage] Erro ao carregar iframe")
src/components/pages/StructureMapPage.tsx:223:      console.error("[StructureMap] load failed", error);
src/components/pages/MarkdownViewer.tsx:35:        console.log("[MarkdownViewer] Fetching:", docsUrl);
src/components/pages/MarkdownViewer.tsx:45:        console.error("[MarkdownViewer] Failed to fetch document:", err);
src/components/pages/telegram-gateway/SimpleChannelsCard.tsx:61:      console.error("Failed to toggle channel:", error);
src/components/pages/CollectionFormDialog.tsx:146:      // console.log('🔍 [CollectionFormDialog] Initializing form:', { mode });
src/components/pages/CollectionFormDialog.tsx:264:      console.error("❌ Validation errors:", validationErrors);
src/components/pages/CollectionFormDialog.tsx:269:    // console.log('✅ Validation passed, starting submission...');
src/components/pages/CollectionFormDialog.tsx:273:      // console.log('📤 Calling onSubmit...');
src/components/pages/CollectionFormDialog.tsx:284:      console.error("❌ Form submission error:", error);
src/components/pages/CollectionFormDialog.tsx:290:      // console.log('🔄 Resetting isSubmitting to false');
src/components/pages/CollectionsManagementCard.tsx:116:      console.log("🔄 Auto-refreshing collections stats...");
```

## Next Steps

### High Priority
1. Fix ESLint errors (run: `npm run lint:fix`)
2. Remove unused imports
3. Add missing keys to list items
4. Fix TypeScript errors

### Medium Priority
1. Replace hardcoded URLs with relative paths
2. Remove or guard console statements
3. Fix useEffect dependencies

### Low Priority
1. Optimize bundle size
2. Remove dead code

## Automated Fixes

Run the following commands to auto-fix what can be fixed:

```bash
# Auto-fix ESLint issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check

# Build and verify
npm run build
```

## Manual Fixes Required

See individual report files in: `/workspace/frontend/dashboard/reports/`
