/**
 * Test page to isolate models loading issue
 */

import React, { useState, useEffect } from "react";
import { collectionsService } from "../../services/collectionsService";
import { EmbeddingModelSelector } from "./EmbeddingModelSelector";
import type { EmbeddingModel } from "../../types/collections";

export const TestModelsPage: React.FC = () => {
  const [models, setModels] = useState<EmbeddingModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("nomic-embed-text");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const renderCountRef = React.useRef(0);

  renderCountRef.current++;

  useEffect(() => {
    console.log("🧪 [TestModelsPage] useEffect triggered");

    let mounted = true;

    const fetchModels = async () => {
      try {
        console.log("🧪 [TestModelsPage] Fetching models...");
        const data = await collectionsService.getModels();
        console.log("🧪 [TestModelsPage] Models received:", data);

        if (mounted) {
          setModels(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("🧪 [TestModelsPage] Error:", err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load models",
          );
          setLoading(false);
        }
      }
    };

    fetchModels();

    return () => {
      mounted = false;
    };
  }, []); // Empty deps - should run only once

  console.log("🧪 [TestModelsPage] Render #", renderCountRef.current, {
    modelsCount: models.length,
    loading,
    error,
    selectedModel,
  });

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>🧪 Models Test Page</h1>

      <div
        style={{ marginBottom: "20px", padding: "10px", background: "#f0f0f0" }}
      >
        <p>
          <strong>Render Count:</strong> {renderCountRef.current}
        </p>
        <p>
          <strong>Models Loaded:</strong> {models.length}
        </p>
        <p>
          <strong>Loading:</strong> {loading ? "Yes" : "No"}
        </p>
        <p>
          <strong>Error:</strong> {error || "None"}
        </p>
      </div>

      {loading && <p>Loading models...</p>}

      {error && (
        <div
          style={{
            padding: "10px",
            background: "#fee",
            border: "1px solid red",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <div>
          <h2>Model Selector</h2>
          <EmbeddingModelSelector
            models={models}
            value={selectedModel}
            onChange={setSelectedModel}
          />

          <div style={{ marginTop: "20px" }}>
            <h3>Models List:</h3>
            <ul>
              {models.map((model) => (
                <li key={model.name}>
                  {model.name} - {model.dimensions}d -{" "}
                  {model.available ? "✅" : "❌"}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: "20px" }}>
            <h3>Selected Model:</h3>
            <pre>{JSON.stringify(selectedModel, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestModelsPage;
