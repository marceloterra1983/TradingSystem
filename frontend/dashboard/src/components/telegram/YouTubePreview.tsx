import React, { useState } from "react";
import { Youtube, Play, ExternalLink } from "@/icons";

interface YouTubeAuthor {
  name: string;
  url: string;
}

interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

interface YouTubePreviewProps {
  preview: {
    type: "youtube";
    url: string;
    videoId: string;
    title: string;
    author: YouTubeAuthor;
    thumbnail: YouTubeThumbnail;
    embedHtml?: string;
    fetchedAt: string;
  };
}

export const YouTubePreview: React.FC<YouTubePreviewProps> = ({ preview }) => {
  const [showEmbed, setShowEmbed] = useState(false);

  // Render embedded player
  if (showEmbed) {
    return (
      <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50">
        {/* Header with close button */}
        <div className="p-3 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-white">
              Reproduzindo vídeo
            </span>
          </div>
          <button
            onClick={() => setShowEmbed(false)}
            className="text-slate-400 hover:text-white transition-colors text-lg font-bold leading-none"
            title="Fechar player"
          >
            ✕
          </button>
        </div>

        <div className="px-3 pb-3">
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
          {/* YouTube iframe */}
          <div className="relative mt-2 pb-[56.25%]">
            {" "}
            {/* 16:9 aspect ratio */}
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${preview.videoId}?autoplay=1`}
              title={preview.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    );
  }

  // Render thumbnail with play button
  return (
    <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 hover:border-red-500 transition-colors">
      {/* Thumbnail */}
      <div
        className="relative cursor-pointer group"
        onClick={() => setShowEmbed(true)}
      >
        <img
          src={preview.thumbnail.url}
          alt={preview.title}
          className="w-full aspect-video object-cover"
          onError={(e) => {
            // Fallback thumbnail
            (e.target as HTMLImageElement).src =
              `https://img.youtube.com/vi/${preview.videoId}/hqdefault.jpg`;
          }}
        />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
          <div className="w-20 h-20 rounded-full bg-red-600/90 group-hover:bg-red-600 flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
            <Play className="w-10 h-10 text-white ml-1" fill="white" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          <Youtube className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white mb-1 line-clamp-2 leading-snug">
              {preview.title}
            </h4>
            {preview.author.name && (
              <a
                href={preview.author.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {preview.author.name}
              </a>
            )}
          </div>
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
            title="Abrir no YouTube"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
};
