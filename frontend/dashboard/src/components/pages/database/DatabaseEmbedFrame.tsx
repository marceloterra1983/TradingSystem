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
    <IframeWithUrl
      src={activeOption?.url}
      title={iframeTitle}
      className="h-full w-full border-0"
      sandbox={sandbox}
      allow={allow}
      wrapperClassName="h-full w-full"
    />
  );
}

export default DatabaseEmbedFrame;
