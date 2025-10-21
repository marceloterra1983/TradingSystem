import React from 'react';
import CodeBlock from '@theme/CodeBlock';

/**
 * Enhanced CodeBlock component with copy button and line numbers
 *
 * Usage:
 * ```tsx
 * <CodeBlock language="python" title="example.py" showLineNumbers>
 * {`def hello():
 *     print("Hello World")`}
 * </CodeBlock>
 * ```
 */

interface EnhancedCodeBlockProps {
  children: string;
  language: string;
  title?: string;
  showLineNumbers?: boolean;
}

export default function EnhancedCodeBlock({
  children,
  language,
  title,
  showLineNumbers = false,
}: EnhancedCodeBlockProps) {
  return (
    <CodeBlock
      language={language}
      title={title}
      showLineNumbers={showLineNumbers}
    >
      {children}
    </CodeBlock>
  );
}
