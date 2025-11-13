import { DatabaseEmbedFrame } from "./DatabaseEmbedFrame";
import { apiConfig } from "../../../config/api";

export function QuestDbWebConsolePage() {
  return (
    <DatabaseEmbedFrame
      url={apiConfig.questdbUiUrl}
      title="QuestDB Web Console"
      openLabel="Abrir QuestDB Web Console"
      iframeTitle="QuestDB Web Console"
    />
  );
}

export default QuestDbWebConsolePage;
