import { DatabaseEmbedFrame } from "./DatabaseEmbedFrame";
import { apiConfig } from "../../../config/api";

export function QuestDbConsolePage() {
  return (
    <DatabaseEmbedFrame
      url={apiConfig.questdbConsoleUrl}
      title="QuestDB Console"
      openLabel="Abrir QuestDB Console"
      iframeTitle="QuestDB Console"
    />
  );
}

export default QuestDbConsolePage;
