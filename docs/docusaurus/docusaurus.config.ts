import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import path from 'path';
import remarkSimplePlantuml from '@akebifiky/remark-simple-plantuml';
import dotenv from 'dotenv';

// Load root .env file for centralized environment configuration
const projectRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'TradingSystem Docs',
  tagline: 'Local Trading System - Clean Architecture + DDD + Microservices',
  favicon: 'img/favicon.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Mermaid diagrams support
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  // Set the production url of your site here
  // Configurable via DOCS_SITE_URL environment variable
  url: process.env.DOCS_SITE_URL || 'http://localhost',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  // Configurable via DOCS_BASE_URL environment variable
  baseUrl: process.env.DOCS_BASE_URL || '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'TradingSystem',
  projectName: 'docs',

  onBrokenLinks: 'warn',

  // Allow iframe embedding for Dashboard integration
  scripts: [
    {
      src: 'https://cdn.jsdelivr.net/npm/iframe-resizer@4.3.2/js/iframeResizer.contentWindow.min.js',
      defer: true,
    },
  ],

  // i18n configuration for PT/EN
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    localeConfigs: {
      pt: {
        label: 'Português',
        direction: 'ltr',
        htmlLang: 'pt-BR',
      },
      en: {
        label: 'English',
        direction: 'ltr',
        htmlLang: 'en-US',
      },
    },
  },

  // Custom fields for search and health dashboard configuration
  customFields: {
    searchApiUrl: process.env.SEARCH_API_URL || 'http://localhost:3400/api/v1/docs',
    searchEnabled: true,
    searchDebounceMs: 500,
    facetsEnabled: true,
    facetsCacheMs: 300000, // 5 minutes
    healthApiUrl: process.env.HEALTH_API_URL || 'http://localhost:3400/api/v1/docs/health',
    healthRefreshInterval: 300000, // 5 minutes
    grafanaUrl: process.env.GRAFANA_URL || 'http://localhost:3000/d/docs-health',
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../context',
          sidebarPath: './sidebars.ts',
          editUrl: undefined, // No edit URL for now
          remarkPlugins: [
            [
              remarkSimplePlantuml,
              {
                baseUrl: process.env.PLANTUML_BASE_URL ?? 'https://www.plantuml.com/plantuml/svg',
              },
            ],
          ],
          sidebarItemsGenerator: async function ({ defaultSidebarItemsGenerator, ...args }) {
            const sidebarItems = await defaultSidebarItemsGenerator(args);
            const excludedDocIds = new Set([
              'backend/architecture/overview',
              'backend/guides/DOCSAPI-QUICK-START',
            ]);

            const filterItems = (items: any[]): any[] =>
              items
                .map((item) => {
                  if (item.type === 'category') {
                    return {
                      ...item,
                      items: filterItems(item.items ?? []),
                    };
                  }

                  return item;
                })
                .filter((item) => {
                  if (item.type === 'doc' && excludedDocIds.has(item.id)) {
                    return false;
                  }

                  return true;
                });

            return filterItems(sidebarItems);
          },
        },
        blog: false, // Disable blog for now
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'TradingSystem',
      logo: {
        alt: 'TradingSystem Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
        width: 24,
        height: 24,
      },
      hideOnScroll: false,
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'doc',
          docId: 'shared/integrations/api-overview',
          position: 'left',
          label: 'API',
        },
        {
          type: 'doc',
          docId: 'shared/integrations/frontend-backend-api-hub',
          position: 'left',
          label: 'API Hub',
        },
        {
          type: 'doc',
          docId: 'shared/summaries/runbooks-adr-overview',
          position: 'left',
          label: 'Runbooks',
        },
        {
          type: 'doc',
          docId: 'shared/tools/openspec/README',
          position: 'left',
          label: 'OpenSpec',
        },
        {
          type: 'search',
          position: 'right',
        },
        {
          type: 'html',
          position: 'right',
          value:
            '<div class="navbar__item navbar__link theme-toggle"><span class="theme-toggle-text">Auto</span><svg class="theme-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg></div>',
        },
        {
          type: 'html',
          position: 'right',
          value:
            '<a href="https://github.com/marceloterra1983/TradingSystem" target="_blank" rel="noopener noreferrer" class="navbar__item navbar__link header-github-link" aria-label="GitHub repository"></a>',
        },
      ],
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/',
            },
            {
              label: 'Visual Diagrams',
              to: '/docs/shared/diagrams-overview',
            },
            {
              label: 'Advanced Search',
              to: '/search',
            },
          ],
        },
        {
          title: 'Architecture',
          items: [
            {
              label: 'Backend',
              to: '/docs/backend/architecture/overview',
            },
            {
              label: 'Frontend',
              to: '/docs/frontend/architecture/overview',
            },
            {
              label: 'Operations',
              to: '/docs/ops/deployment/windows-native',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/marceloterra1983/TradingSystem',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} TradingSystem. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  plugins: [
    function contextDocsAliasPlugin() {
      return {
        name: 'context-docs-alias-plugin',
        configureWebpack() {
          return {
            resolve: {
              alias: {
                '@site/docs': path.resolve(__dirname, '../context'),
              },
            },
          };
        },
      };
    },
  ],
};

export default config;




