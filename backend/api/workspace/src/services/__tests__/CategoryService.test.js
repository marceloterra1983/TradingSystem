import { jest } from "@jest/globals";
import { CategoryService } from "../CategoryService.js";

const createLoggerMock = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
});

const createService = (mockCategories) => {
  const mockDb = {
    getCategories: jest.fn().mockResolvedValue(mockCategories),
  };
  const service = new CategoryService(mockDb, createLoggerMock());
  return { service, mockDb };
};

describe("CategoryService - normalization", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes legacy lowdb payloads that only expose `active`", async () => {
    const rawCategories = [
      {
        id: "feature",
        name: "feature",
        description: "Novas funcionalidades",
        color: "#10b981",
        display_order: 3,
        active: true,
      },
    ];

    const { service } = createService(rawCategories);
    const categories = await service.getCategories(true);

    expect(categories).toHaveLength(1);
    expect(categories[0]).toMatchObject({
      id: "feature",
      name: "feature",
      is_active: true,
      display_order: 3,
      color: "#10b981",
    });
  });

  it("provides sensible fallbacks when optional fields are missing", async () => {
    const rawCategories = [
      {
        name: "docs",
        description: "Documentação",
        active: false,
      },
    ];

    const { service } = createService(rawCategories);
    const categories = await service.getCategories(true);

    expect(categories[0]).toMatchObject({
      id: "docs",
      name: "docs",
      is_active: false,
      display_order: 1, // falls back to index when no order info present
      color: "#6B7280", // default brand gray
    });
  });
});
