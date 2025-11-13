import React from "react";
import {
  Twitter,
  Heart,
  Repeat2,
  MessageCircle,
  ExternalLink,
} from '@/icons';

interface TwitterAuthor {
  id: string;
  name: string;
  username: string;
  profileImage: string;
}

interface TwitterMetrics {
  likes: number;
  retweets: number;
  replies: number;
}

interface TwitterMedia {
  type: "photo" | "video";
  url: string;
  thumbnail?: string;
}

interface TwitterPreviewProps {
  preview: {
    type: "twitter";
    url: string;
    tweetId?: string;
    text?: string;
    author?: TwitterAuthor;
    createdAt?: string;
    metrics?: TwitterMetrics;
    media?: TwitterMedia;
    fetchedAt?: string;
    // Fallback fields (Open Graph)
    title?: string;
    description?: string;
    image?: string;
  };
}

export const TwitterPreview: React.FC<TwitterPreviewProps> = ({ preview }) => {
  // Rich rendering (if we have full API data)
  if (preview.author && preview.text) {
    return (
      <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 hover:border-slate-600 transition-colors">
        {/* Header */}
        <div className="p-3 flex items-start gap-3">
          {preview.author.profileImage && (
            <img
              src={preview.author.profileImage}
              alt={preview.author.name}
              className="w-12 h-12 rounded-full flex-shrink-0"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                (e.target as HTMLImageElement).src =
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(preview.author!.name)}&background=3b82f6&color=fff&size=48`;
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white truncate">
                {preview.author.name}
              </span>
              <Twitter className="w-4 h-4 text-blue-400 flex-shrink-0" />
            </div>
            <span className="text-sm text-slate-400">
              @{preview.author.username}
            </span>
          </div>
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-blue-400 transition-colors flex-shrink-0"
            title="Abrir no Twitter"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>

        {/* Content */}
        <div className="px-3 pb-3">
          <p className="text-white whitespace-pre-wrap break-words">
            {preview.text}
          </p>
        </div>

        {/* Media */}
        {preview.media && (
          <div className="px-3 pb-3">
            {preview.media.type === "photo" && (
              <img
                src={preview.media.url}
                alt="Tweet media"
                className="rounded-lg w-full max-h-96 object-cover"
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            {preview.media.type === "video" && preview.media.thumbnail && (
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={preview.media.thumbnail}
                  alt="Video thumbnail"
                  className="w-full max-h-96 object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-16 h-16 rounded-full bg-blue-500/80 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-8 border-l-white border-y-6 border-y-transparent ml-1"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metrics */}
        {preview.metrics && (
          <div className="px-3 pb-3 flex gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-1 hover:text-rose-400 transition-colors">
              <Heart className="w-4 h-4" />
              <span>{formatMetric(preview.metrics.likes)}</span>
            </div>
            <div className="flex items-center gap-1 hover:text-green-400 transition-colors">
              <Repeat2 className="w-4 h-4" />
              <span>{formatMetric(preview.metrics.retweets)}</span>
            </div>
            <div className="flex items-center gap-1 hover:text-blue-400 transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>{formatMetric(preview.metrics.replies)}</span>
            </div>
          </div>
        )}

        {/* Timestamp */}
        {preview.createdAt && (
          <div className="px-3 pb-3 text-xs text-slate-500">
            {formatDate(preview.createdAt)}
          </div>
        )}
      </div>
    );
  }

  // Simple rendering (Open Graph fallback)
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 block border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 hover:border-blue-500 transition-colors"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title || "Tweet"}
          className="w-full h-48 object-cover"
          onError={(e) => {
            // Hide image if it fails to load
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Twitter className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-slate-400">Twitter/X</span>
          <ExternalLink className="w-3 h-3 text-slate-500 ml-auto" />
        </div>
        {preview.title && (
          <h4 className="font-semibold text-white mb-1 line-clamp-2">
            {preview.title}
          </h4>
        )}
        {preview.description && (
          <p className="text-sm text-slate-400 line-clamp-3">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
};

/**
 * Format large numbers (1.2K, 1.2M, etc.)
 */
function formatMetric(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format ISO date to Brazilian format
 */
function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}
