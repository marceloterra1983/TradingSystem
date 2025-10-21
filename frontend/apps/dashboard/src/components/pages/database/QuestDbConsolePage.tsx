import { DatabaseEmbedFrame } from './DatabaseEmbedFrame';
import { apiConfig } from '../../../config/api';

export function QuestDbConsolePage() {
  return (
    <DatabaseEmbedFrame
      url={apiConfig.questdbConsoleUrl}
      title="QuestDB Console"
      openLabel="Abrir QuestDB Console"
      iframeTitle="QuestDB Console"
      alternateUrls={[
        { label: 'Port 9002', url: 'http://localhost:9002' },
        { label: 'Port 8813', url: 'http://localhost:8813' },
        { label: 'Port 9000', url: 'http://localhost:9000' },
      ]}
    />
  );
}

export default QuestDbConsolePage;
