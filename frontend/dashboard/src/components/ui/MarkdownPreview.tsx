/**
 * Markdown Preview Component
 *
 * Wraps ReactMarkdown with remark-gfm and rehype-raw plugins.
 * This component is lazy-loaded to reduce initial bundle size (~63KB savings).
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({
  content,
  className = '',
}: MarkdownPreviewProps) {
  return (
    <div
      className={`prose prose-slate dark:prose-invert prose-sm ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
