import { DatabaseEmbedFrame } from "./DatabaseEmbedFrame";
import { apiConfig } from "../../../config/api";

export function PgWebPage() {
  return (
    <DatabaseEmbedFrame
      url={apiConfig.pgWebUrl}
      title="pgweb"
      openLabel="Abrir pgweb"
      iframeTitle="pgweb"
    />
  );
}

export default PgWebPage;
