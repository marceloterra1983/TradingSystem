import React, { useState } from 'react';

interface CopyButtonProps {
  content: string;
  className?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ content, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      className={`copy-button ${className}`}
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy as Markdown'}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {copied ? (
          <path d="M20 6L9 17l-5-5" />
        ) : (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </>
        )}
      </svg>
      {copied ? 'Copied!' : 'Copy as Markdown'}
    </button>
  );
};

export default CopyButton;




