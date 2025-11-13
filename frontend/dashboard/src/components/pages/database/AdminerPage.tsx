import { DatabaseEmbedFrame } from "./DatabaseEmbedFrame";
import { apiConfig } from "../../../config/api";

export function AdminerPage() {
  return (
    <DatabaseEmbedFrame
      url={apiConfig.adminerUrl}
      title="Adminer"
      openLabel="Abrir Adminer"
      iframeTitle="Adminer"
    />
  );
}

export default AdminerPage;
