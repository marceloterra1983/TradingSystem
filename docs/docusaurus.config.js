// @ts-check
// Baseline Docusaurus configuration for the TradingSystem documentation portal.

const {themes} = require('prism-react-renderer');
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;
const repoUrl = 'https://github.com/marceloterra1983/TradingSystem';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'TradingSystem Docs',
  tagline: 'Product knowledge, runbooks, and specs in one place',
  url: 'https://docs.tradingsystem.local',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.svg',
  organizationName: 'marceloterra1983',
  projectName: 'TradingSystem',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'content',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: `${repoUrl}/tree/main/docs/`,
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          // Versioning configuration
          lastVersion: process.env.NODE_ENV === 'development' ? 'current' : '1.0.0',
          // Version configuration
          // NOTE: Version labels are automatically updated by scripts/docs/auto-version.sh
          // when creating new versions via GitHub Actions workflow (docs-versioning.yml)
          //
          // Label format:
          // - Latest stable: "X.X.X (Stable) ✅" with path: '' (root)
          // - Previous versions: "X.X.X" with path: 'vX.X.X'
          // - Current (unreleased): "Next (Unreleased) 🚧" with path: 'next'
          //
          // See: governance/strategy/VERSIONING-AUTOMATION.md for details
          versions: {
            current: {
              label: 'Next (Unreleased) 🚧',
              path: 'next',
              banner: 'unreleased',
            },
            '1.0.0': {
              label: '1.0.0 (Stable) ✅',
              path: '',
              banner: 'none',
            },
            // Example when multiple versions exist:
            // '2.0.0': {
            //   label: '2.0.0 (Stable) ✅',
            //   path: '',  // Latest stable at root
            //   banner: 'none',
            // },
            // '1.0.0': {
            //   label: '1.0.0',
            //   path: 'v1.0.0',  // Previous version at versioned path
            //   banner: 'none',
            // },
          },
          // Only build current version in development for fast iteration
          onlyIncludeVersions: process.env.NODE_ENV === 'development' ? ['current'] : undefined,
        },
        blog: false,
        pages: {
          path: 'src/pages',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
    [
      'redocusaurus',
      {
        specs: [
          {
            id: 'documentation-api',
            spec: 'static/specs/documentation-api.openapi.yaml',
            route: '/api/documentation-api',
          },
          {
            id: 'workspace-api',
            spec: 'static/specs/workspace.openapi.yaml',
            route: '/api/workspace',
          },
          {
            id: 'tp-capital-api',
            spec: 'static/specs/tp-capital.openapi.yaml',
            route: '/api/tp-capital',
          },
          {
            id: 'status-api',
            spec: 'static/specs/status-api.openapi.yaml',
            route: '/api/status',
          },
          {
            id: 'firecrawl-proxy',
            spec: 'static/specs/firecrawl-proxy.openapi.yaml',
            route: '/api/firecrawl',
          },
          {
            id: 'telegram-gateway-api',
            spec: 'static/specs/telegram-gateway-api.openapi.yaml',
            route: '/api/telegram-gateway',
          },
          {
            id: 'alert-router',
            spec: 'static/specs/alert-router.openapi.yaml',
            route: '/api/alert-router',
          },
        ],
        theme: {
          // Light Mode Colors
          primaryColor: '#0ea5e9',           // Sky blue for primary elements
          textColor: '#1e293b',              // Slate-800 for main text
          backgroundColor: '#ffffff',        // White background

          // Right panel (examples/responses)
          rightPanelBackgroundColor: '#f8fafc', // Slate-50
          rightPanelTextColor: '#334155',    // Slate-700

          // Code blocks
          codeBlockBackgroundColor: '#0f172a', // Slate-900 for code
          codeBlockTextColor: '#e2e8f0',     // Slate-200

          // Links and interactive elements
          linkColor: '#0284c7',              // Sky-600
          linkHoverColor: '#0369a1',         // Sky-700

          // Menu/Sidebar
          menuBackgroundColor: '#ffffff',
          menuTextColor: '#475569',          // Slate-600
          menuActiveTextColor: '#0ea5e9',    // Sky-500
          menuGroupTextColor: '#64748b',     // Slate-500

          // Headings
          headingsColor: '#0f172a',          // Slate-900

          // Borders
          borderColor: '#e2e8f0',            // Slate-200

          // Success/Warning/Error colors
          successColor: '#10b981',           // Emerald-500
          warningColor: '#f59e0b',           // Amber-500
          errorColor: '#ef4444',             // Red-500

          // HTTP Method colors
          httpGetColor: '#10b981',           // Green for GET
          httpPostColor: '#3b82f6',          // Blue for POST
          httpPutColor: '#f59e0b',           // Orange for PUT
          httpDeleteColor: '#ef4444',        // Red for DELETE
          httpPatchColor: '#8b5cf6',         // Purple for PATCH
        },
      },
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'TradingSystem Docs',
        logo: {
          alt: 'TradingSystem Logo',
          src: 'img/logo-light.svg',
          srcDark: 'img/logo.svg',
          width: 32,
          height: 32,
        },
        items: [
          {
            type: 'doc',
            docId: 'index',
            position: 'left',
            label: 'Overview',
          },
          {
            type: 'dropdown',
            label: 'APIs',
            position: 'left',
            items: [
              {
                label: 'Status API',
                to: '/api/status',
              },
              {
                label: 'Alert Router',
                to: '/api/alert-router',
              },
              {
                label: 'Firecrawl Proxy',
                to: '/api/firecrawl',
              },
              {
                label: 'Documentation API',
                to: '/api/documentation-api',
              },
              {
                label: 'Workspace API',
                to: '/api/workspace',
              },
              {
                label: 'TP Capital API',
                to: '/api/tp-capital',
              },
              {
                label: 'Telegram Gateway API',
                to: '/api/telegram-gateway',
              },
            ],
          },
          {
            type: 'docsVersionDropdown',
            position: 'right',
            dropdownActiveClassDisabled: true,
            dropdownItemsAfter: [
              {
                type: 'html',
                value: '<hr style="margin: 0.3rem 0;">',
              },
              {
                href: 'https://github.com/TradingSystem/TradingSystem/releases',
                label: 'All Releases',
              },
            ],
          },
          {
            href: 'https://github.com/TradingSystem/TradingSystem',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Overview',
                to: '/',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Issues',
                href: 'https://github.com/TradingSystem/TradingSystem/issues',
              },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} TradingSystem contributors.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['bash', 'json', 'sql', 'yaml', 'typescript', 'javascript', 'jsx', 'tsx'],
      },
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      announcementBar: {
        id: 'support_us',
        content:
          '⭐ Se esta documentação foi útil, considere dar uma estrela no <a target="_blank" rel="noopener noreferrer" href="https://github.com/TradingSystem/TradingSystem">GitHub</a>!',
        backgroundColor: '#06b6d4',
        textColor: '#ffffff',
        isCloseable: true,
      },
    }),
};

module.exports = config;
