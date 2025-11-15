import { beforeEach, describe, expect, it, vi } from "vitest";
import { firecrawlService } from "../firecrawlService";

vi.mock("../../config/api", () => ({
  getApiUrl: () => "http://localhost:3600",
}));

const baseUrl = "http://localhost:3600";
const apiUrl = `${baseUrl}/api/v1`;

const createResponse = <T>(payload: T, init?: Partial<Response>): Response =>
  ({
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => payload,
  }) as unknown as Response;

describe("firecrawlService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("scrape", () => {
    it("returns data when Firecrawl responds with bare payload", async () => {
      const resultPayload = { markdown: "# Hello" };

      const fetchMock = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(createResponse(resultPayload));

      const result = await firecrawlService.scrape({
        url: "https://example.com",
        formats: ["markdown"],
        timeout: 2000,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        `${apiUrl}/scrape`,
        expect.anything(),
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(resultPayload);
      expect(result.error).toBeUndefined();
    });

    it("normalizes error when backend returns non-ok response", async () => {
      const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
        createResponse(
          {
            success: false,
            error: "Upstream error",
          },
          { ok: false, status: 500 },
        ),
      );

      const result = await firecrawlService.scrape({
        url: "https://example.com",
      });

      expect(fetchMock).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Upstream error");
    });

    it("maps network errors to offline hint", async () => {
      vi.spyOn(global, "fetch").mockRejectedValueOnce(
        new Error("Failed to fetch"),
      );

      const result = await firecrawlService.scrape({
        url: "https://example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unable to reach the Firecrawl proxy");
    });
  });

  describe("healthCheck", () => {
    it("returns ok when service responds 200", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(createResponse({}));

      const result = await firecrawlService.healthCheck();

      expect(result).toEqual({ status: "ok" });
    });

    it("returns error for non-ok status", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        createResponse({}, { ok: false, status: 503 }),
      );

      const result = await firecrawlService.healthCheck();

      expect(result.status).toBe("error");
      expect(result.error).toContain("503");
    });

    it("normalizes network errors", async () => {
      vi.spyOn(global, "fetch").mockRejectedValueOnce(
        new Error("NetworkError when attempting to fetch resource."),
      );

      const result = await firecrawlService.healthCheck();

      expect(result.status).toBe("error");
      expect(result.error).toContain("Unable to reach the Firecrawl proxy");
    });
  });
});
