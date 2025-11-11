/* vitest-environment node */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const integrationEnabled =
  process.env.DASHBOARD_API_INTEGRATION === "true" ||
  process.env.DASHBOARD_API_INTEGRATION === "1";

const describeIntegration = integrationEnabled ? describe : describe.skip;

if (!integrationEnabled) {
  // eslint-disable-next-line no-console
  console.warn(
    "[integration] Skipping dashboard API integration suite. Set DASHBOARD_API_INTEGRATION=true to enable.",
  );
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

describeIntegration("Dashboard ↔ API integration", () => {
  const documentationBase =
    process.env.DASHBOARD_DOCUMENTATION_API_URL ||
    process.env.VITE_DOCUMENTATION_API_URL ||
    "http://localhost:9080/api/docs";
  const workspaceBase =
    process.env.DASHBOARD_WORKSPACE_API_URL ||
    process.env.VITE_API_BASE_URL ||
    "http://localhost:9080";
  const workspaceHealthOverride = process.env.DASHBOARD_WORKSPACE_HEALTH_URL;

  beforeAll(() => {
    vi.resetModules();
    vi.stubEnv("VITE_USE_UNIFIED_DOMAIN", "false");
    vi.stubEnv(
      "VITE_DOCUMENTATION_API_URL",
      trimTrailingSlash(documentationBase),
    );
    // Provide explicit workspace endpoints to avoid relying on proxy paths.
    const normalizedWorkspace = trimTrailingSlash(workspaceBase);
    vi.stubEnv("VITE_API_BASE_URL", normalizedWorkspace);
    vi.stubEnv(
      "VITE_WORKSPACE_API_URL",
      `${normalizedWorkspace}/api/workspace`,
    );
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("reports healthy documentation API", async () => {
    const { documentationService } = await import(
      "../../services/documentationService"
    );

    const health = await documentationService.healthCheck();

    expect(typeof health.status).toBe("string");
    expect(health.status.toLowerCase()).not.toBe("unhealthy");
    expect(health.error ?? null).toBeNull();
    if (health.timestamp) {
      expect(new Date(health.timestamp).toString()).not.toBe("Invalid Date");
    }
  }, 25_000);

  it("validates documentation metrics contract", async () => {
    const { documentationService } = await import(
      "../../services/documentationService"
    );

    const metrics = await documentationService.getDocumentationMetrics();

    expect(metrics).toHaveProperty("success", true);
    expect(metrics).toHaveProperty("data");
    expect(metrics.data).toHaveProperty("healthScore");
    expect(metrics.data).toHaveProperty("freshness");
    expect(metrics.data).toHaveProperty("issues");
    expect(metrics.data).toHaveProperty("coverage");
  }, 30_000);

  it("confirms workspace API health via endpoint validator", async () => {
    // Re-import with current env overrides to pick up workspace base URL.
    const { ENDPOINTS, validateEndpoint } = await import(
      "../../config/endpoints"
    );

    const targetUrl = workspaceHealthOverride ?? ENDPOINTS.workspace;
    const healthy = await validateEndpoint(targetUrl);

    expect(healthy).toBe(true);
  }, 15_000);
});
