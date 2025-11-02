/**
 * Vite Plugin: Preload Hints
 * 
 * Adds <link rel="preload"> tags to index.html for critical chunks
 * This improves perceived performance by loading critical resources earlier
 */

import type { Plugin } from 'vite';

export interface PreloadHintsOptions {
  /**
   * Chunks to preload (without hash)
   * Example: ['react-vendor', 'ui-radix']
   */
  chunks?: string[];
  
  /**
   * Whether to use modulepreload for JS chunks
   * Default: true
   */
  modulepreload?: boolean;
}

export function preloadHints(options: PreloadHintsOptions = {}): Plugin {
  const {
    chunks = ['react-vendor', 'ui-radix', 'icons-vendor', 'utils-vendor'],
    modulepreload = true,
  } = options;

  return {
    name: 'vite-plugin-preload-hints',
    apply: 'build',
    
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html;

      const preloadLinks: string[] = [];

      // Find chunk files matching our preload list
      Object.values(ctx.bundle).forEach((chunk) => {
        if (chunk.type === 'chunk') {
          const chunkName = chunk.name;
          
          // Check if this chunk should be preloaded
          const shouldPreload = chunks.some(name => 
            chunkName.startsWith(name)
          );

          if (shouldPreload) {
            const rel = modulepreload ? 'modulepreload' : 'preload';
            preloadLinks.push(
              `<link rel="${rel}" href="/${chunk.fileName}" as="script" crossorigin>`
            );
          }
        }
      });

      // Inject preload links before closing </head>
      if (preloadLinks.length > 0) {
        const preloadSection = `\n    <!-- Preload critical chunks for faster load -->\n    ${preloadLinks.join('\n    ')}\n  `;
        html = html.replace('</head>', `${preloadSection}</head>`);
      }

      return html;
    },
  };
}


