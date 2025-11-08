import { DatabaseEmbedFrame } from "./DatabaseEmbedFrame";
import { apiConfig } from "../../../config/api";

export function QuestDbWebConsolePage() {
  return (
    <DatabaseEmbedFrame
      url={apiConfig.questdbUiUrl}
      title="QuestDB Web Console"
      openLabel="Abrir QuestDB Web Console"
      iframeTitle="QuestDB Web Console"
      alternateUrls={[
        { label: "Port 9010", url: "http://localhost:9010" },
        { label: "Port 8813", url: "http://localhost:8813" },
        { label: "Port 9009", url: "http://localhost:9009" },
      ]}
    />
  );
}

export default QuestDbWebConsolePage;
