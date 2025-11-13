import React, { useState } from "react";
import { Instagram, ExternalLink, Play } from '@/icons';

interface InstagramAuthor {
  name: string;
  url: string;
}

interface InstagramThumbnail {
  url: string;
  width: number;
  height: number;
}

interface InstagramPreviewProps {
  preview: {
    type: "instagram";
    url: string;
    postId: string;
    postType: "post" | "reel";
    title?: string;
    author: InstagramAuthor;
    thumbnail: InstagramThumbnail;
    basic?: boolean; // True if using basic preview (no API token)
    fetchedAt: string;
  };
}

export const InstagramPreview: React.FC<InstagramPreviewProps> = ({
  preview,
}) => {
  const [showEmbed, setShowEmbed] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Render embedded post (Instagram embed)
  if (showEmbed) {
    return (
      <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50">
        {/* Header with close button */}
        <div className="p-3 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            <span className="text-sm font-medium text-white">
              {preview.postType === "reel"
                ? "Instagram Reel"
                : "Instagram Post"}
            </span>
          </div>
          <button
            onClick={() => setShowEmbed(false)}
            className="text-slate-400 hover:text-white transition-colors text-lg font-bold leading-none"
            title="Fechar preview"
          >
            ✕
          </button>
        </div>

        <div className="px-3 pt-3">
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block max-w-full truncate text-xs font-medium text-slate-300 hover:text-white hover:underline"
            title={preview.url}
            data-testid="iframe-source-url"
          >
            {preview.url}
          </a>
        </div>
        {/* Instagram iframe embed */}
        <div className="relative bg-white" style={{ height: "600px" }}>
          <iframe
            className="w-full h-full"
            src={`https://www.instagram.com/p/${preview.postId}/embed/captioned`}
            title={preview.title || "Instagram Post"}
            frameBorder="0"
            scrolling="no"
            allowTransparency
          />
        </div>
      </div>
    );
  }

  // Render thumbnail preview
  return (
    <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 hover:border-pink-500 transition-colors">
      {/* Thumbnail */}
      <div
        className="relative cursor-pointer group"
        onClick={() => setShowEmbed(true)}
      >
        {!imageError ? (
          <>
            <img
              src={preview.thumbnail.url}
              alt={preview.title || "Instagram Post"}
              className="w-full aspect-square object-cover"
              onError={() => setImageError(true)}
            />

            {/* Overlay for reels (play button) */}
            {preview.postType === "reel" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                <div className="w-20 h-20 rounded-full bg-pink-600/90 group-hover:bg-pink-600 flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
                  <Play className="w-10 h-10 text-white ml-1" fill="white" />
                </div>
              </div>
            )}

            {/* Instagram icon overlay for regular posts */}
            {preview.postType === "post" && (
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
          </>
        ) : (
          /* Fallback when thumbnail fails to load */
          <div className="w-full aspect-square bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
            <Instagram className="w-24 h-24 text-white opacity-50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          <Instagram className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {preview.title && !preview.basic && (
              <h4 className="font-semibold text-white mb-1 line-clamp-2 leading-snug">
                {preview.title}
              </h4>
            )}
            {preview.basic && (
              <p className="text-sm text-slate-400 mb-1">
                {preview.postType === "reel" ? "🎬 Reel" : "📸 Post"} do
                Instagram
              </p>
            )}
            {preview.author.name && preview.author.name !== "Instagram" && (
              <a
                href={preview.author.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-400 hover:text-pink-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                @{preview.author.name}
              </a>
            )}
            {preview.basic && (
              <p className="text-xs text-slate-500 mt-1">
                Preview básico (configure INSTAGRAM_ACCESS_TOKEN para preview
                rico)
              </p>
            )}
          </div>
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-pink-400 transition-colors flex-shrink-0"
            title="Abrir no Instagram"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
};
