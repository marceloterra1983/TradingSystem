import * as React from "react";
import { ExternalLink } from '@/icons';
import { Button } from "../../ui/button";
import { IframeWithUrl } from "../../common/IframeWithUrl";

interface AlternateUrl {
  label: string;
  url: string;
}

interface DatabaseEmbedFrameProps {
  url: string;
  title: string;
  openLabel: string;
  iframeTitle: string;
  sandbox?: string;
  allow?: string;
  alternateUrls?: AlternateUrl[];
}

const isBrowser = typeof window !== "undefined";

const uniqueByUrl = (options: AlternateUrl[]): AlternateUrl[] => {
  const map = new Map<string, AlternateUrl>();
  for (const option of options) {
    if (!map.has(option.url)) {
      map.set(option.url, option);
    }
  }
  return Array.from(map.values());
};

export function DatabaseEmbedFrame({
  url,
  title,
  openLabel,
  iframeTitle,
  sandbox = "allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-modals",
  allow = "clipboard-read; clipboard-write",
  alternateUrls = [],
}: DatabaseEmbedFrameProps) {
  const options = React.useMemo<AlternateUrl[]>(() => {
    const baseOption = { label: "Auto", url };
    return uniqueByUrl([baseOption, ...alternateUrls]);
  }, [url, alternateUrls]);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeOption = options[activeIndex] ?? options[0];

  const handleOpen = React.useCallback(() => {
    if (!isBrowser || !activeOption) {
      return;
    }
    window.open(activeOption.url, "_blank", "noopener,noreferrer");
  }, [activeOption]);

  return (
    <div className="h-[calc(100vh-160px)] w-full">
      <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          {options.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {options.map((option, index) => (
                <Button
                  key={option.url}
                  variant={index === activeIndex ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setActiveIndex(index)}
                  disabled={index === activeIndex}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleOpen}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {openLabel}
        </Button>
      </div>
      <IframeWithUrl
        src={activeOption?.url}
        title={iframeTitle}
        className="h-[calc(100%-40px)] w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700"
        sandbox={sandbox}
        allow={allow}
        wrapperClassName="h-[calc(100%-40px)]"
      />
    </div>
  );
}

export default DatabaseEmbedFrame;
