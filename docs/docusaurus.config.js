// @ts-check
// Baseline Docusaurus configuration for the TradingSystem documentation portal.

const {themes} = require('prism-react-renderer');
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'TradingSystem Docs',
  tagline: 'Product knowledge, runbooks, and specs in one place',
  url: 'https://example.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/logo.svg',
  organizationName: 'TradingSystem',
  projectName: 'docs',
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
          editUrl: 'https://github.com/TradingSystem/TradingSystem/tree/main/docs/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
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
          src: 'img/logo.svg',
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
        additionalLanguages: ['bash', 'json', 'sql'],
      },
    }),
};

module.exports = config;
