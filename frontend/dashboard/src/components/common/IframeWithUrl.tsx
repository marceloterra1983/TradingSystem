import * as React from "react";

import { cn } from "../../lib/utils";

interface IframeWithUrlProps
  extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  wrapperClassName?: string;
  urlLabel?: string;
  linkTarget?: string;
  showLink?: boolean;
  allowFeatures?: string[];
  sandboxPermissions?: string[];
}

export const IframeWithUrl = React.forwardRef<
  HTMLIFrameElement,
  IframeWithUrlProps
>(
  (
    {
      src,
      wrapperClassName,
      className,
      urlLabel,
      showLink = true,
      linkTarget = "_blank",
      allow,
      sandbox,
      allowFeatures,
      sandboxPermissions,
      ...props
    },
    ref,
  ) => {
    const displayUrl = urlLabel ?? src ?? "";
    const shouldRenderUrl = Boolean(displayUrl);
    const normalizedAllow =
      allow ??
      (allowFeatures && allowFeatures.length > 0
        ? allowFeatures.join("; ")
        : undefined);
    const normalizedSandbox =
      sandbox ??
      (sandboxPermissions && sandboxPermissions.length > 0
        ? sandboxPermissions.join(" ")
        : undefined);

    return (
      <div
        className={cn(
          "flex flex-col",
          shouldRenderUrl && showLink ? "gap-2" : "",
          wrapperClassName,
        )}
      >
        {shouldRenderUrl && showLink && (
          <a
            href={src}
            target={linkTarget}
            rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
            className="max-w-full truncate text-xs font-medium text-[color:var(--ts-text-muted)] hover:underline"
            title={displayUrl}
            data-testid="iframe-source-url"
          >
            {displayUrl}
          </a>
        )}
        {shouldRenderUrl && !showLink && (
          <span
            className="max-w-full truncate text-xs font-medium text-[color:var(--ts-text-muted)]"
            title={displayUrl}
            data-testid="iframe-source-url"
          >
            {displayUrl}
          </span>
        )}
        <iframe
          ref={ref}
          src={src}
          className={className}
          allow={normalizedAllow}
          sandbox={normalizedSandbox}
          {...props}
        />
      </div>
    );
  },
);

IframeWithUrl.displayName = "IframeWithUrl";

export default IframeWithUrl;
