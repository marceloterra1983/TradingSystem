import React from "react";
import { ExternalLink, Globe } from "lucide-react";

interface GenericLinkPreviewProps {
  preview: {
    type: "generic";
    url: string;
    title: string;
    description?: string | null;
    image?: string | null;
    siteName?: string | null;
    domain: string;
    fetchedAt: string;
  };
}

export const GenericLinkPreview: React.FC<GenericLinkPreviewProps> = ({
  preview,
}) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 block border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 hover:border-cyan-500 transition-colors"
    >
      {/* Image */}
      {preview.image && !imageError && (
        <img
          src={preview.image}
          alt={preview.title}
          className="w-full h-48 object-cover"
          onError={() => setImageError(true)}
        />
      )}

      {/* Content */}
      <div className="p-3">
        {/* Header with domain */}
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="text-xs text-slate-400 truncate">
            {preview.siteName || preview.domain}
          </span>
          <ExternalLink className="w-3 h-3 text-slate-500 ml-auto flex-shrink-0" />
        </div>

        {/* Title */}
        {preview.title && (
          <h4 className="font-semibold text-white mb-1 line-clamp-2 leading-snug">
            {preview.title}
          </h4>
        )}

        {/* Description */}
        {preview.description && (
          <p className="text-sm text-slate-400 line-clamp-3">
            {preview.description}
          </p>
        )}

        {/* Domain (if no siteName) */}
        {!preview.siteName && !preview.description && (
          <p className="text-xs text-slate-500 mt-1">{preview.domain}</p>
        )}
      </div>
    </a>
  );
};
