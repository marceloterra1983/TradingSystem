import { DatabaseEmbedFrame } from "./DatabaseEmbedFrame";
import { apiConfig } from "../../../config/api";

export function PgAdminPage() {
  return (
    <DatabaseEmbedFrame
      url={apiConfig.pgAdminUrl}
      title="pgAdmin"
      openLabel="Abrir pgAdmin"
      iframeTitle="pgAdmin"
    />
  );
}

export default PgAdminPage;
