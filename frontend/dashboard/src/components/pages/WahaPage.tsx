import { useMemo } from "react";
import { IframeWithUrl } from "../common/IframeWithUrl";

const resolveWahaUrl = () => {
  const env = import.meta.env as Record<string, string | undefined>;
  const baseUrl = env.VITE_WAHA_DASHBOARD_URL || "/waha/dashboard/";
  return baseUrl;
};

export default function WahaPage() {
  const iframeUrl = useMemo(resolveWahaUrl, []);

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      <IframeWithUrl
        src={iframeUrl}
        className="w-full h-full"
        style={{ border: "none" }}
        title="WAHA Dashboard"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-downloads"
        wrapperClassName="h-full"
      />
    </div>
  );
}
