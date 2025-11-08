import { randomUUID } from "crypto";
import {
  ensurePrismaConnection,
  getPrismaClient,
} from "../../utils/prismaClient.js";
import { logger } from "../../config/logger.js";

const ORDERABLE_FIELDS = new Map([
  ["updated_at", "updatedAt"],
  ["created_at", "createdAt"],
  ["name", "name"],
  ["status", "status"],
  ["response_time_ms", "responseTimeMs"],
]);

function normalizeTags(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeMetadata(value) {
  if (!value) {
    return null;
  }
  if (typeof value === "object") {
    return value;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeSystem(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    description: record.description,
    type: record.type,
    url: record.url,
    status: record.status,
    last_checked: record.lastChecked ?? null,
    response_time_ms: record.responseTimeMs ?? null,
    version: record.version ?? null,
    owner: record.owner ?? null,
    tags: normalizeTags(record.tags),
    metadata: normalizeMetadata(record.metadata),
    icon: record.icon ?? null,
    color: record.color ?? null,
    host: record.host ?? null,
    port: record.port ?? null,
    created_by: record.createdBy ?? null,
    designated_timestamp: record.designatedTimestamp ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function sanitizeTagsInput(tags) {
  if (tags === undefined) {
    return undefined;
  }
  if (Array.isArray(tags)) {
    return Array.from(new Set(tags));
  }
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? Array.from(new Set(parsed)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function sanitizeMetadataInput(metadata) {
  if (metadata === undefined) {
    return undefined;
  }
  if (metadata === null) {
    return null;
  }
  if (typeof metadata === "object") {
    return metadata;
  }
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  }
  return null;
}

function buildWhere(filters = {}) {
  const where = {};

  if (filters.name) {
    where.name = filters.name;
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status };
    } else {
      where.status = filters.status;
    }
  }

  if (filters.type) {
    if (Array.isArray(filters.type)) {
      where.type = { in: filters.type };
    } else {
      where.type = filters.type;
    }
  }

  if (filters.owner) {
    if (Array.isArray(filters.owner)) {
      where.owner = { in: filters.owner };
    } else {
      where.owner = filters.owner;
    }
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

function mapOrderBy(orderBy = "updated_at", orderDirection = "DESC") {
  const normalizedField = orderBy.toLowerCase();
  const prismaField = ORDERABLE_FIELDS.get(normalizedField) ?? "updatedAt";
  const direction = orderDirection?.toLowerCase() === "asc" ? "asc" : "desc";
  return { [prismaField]: direction };
}

function sanitizeUpdates(updateData = {}) {
  const allowed = new Set([
    "name",
    "description",
    "type",
    "url",
    "status",
    "last_checked",
    "response_time_ms",
    "version",
    "owner",
    "tags",
    "metadata",
    "icon",
    "color",
    "host",
    "port",
  ]);

  return Object.fromEntries(
    Object.entries(updateData).filter(
      ([key, value]) => allowed.has(key) && value !== undefined,
    ),
  );
}

class PostgresSystemsRepository {
  constructor() {
    this.client = getPrismaClient();
    this.connected = false;
  }

  async ensureConnected() {
    if (!this.connected) {
      await ensurePrismaConnection();
      this.connected = true;
    }
  }

  async create(systemData) {
    await this.ensureConnected();
    const now = new Date();

    const systemId = systemData.id || randomUUID();

    const system = await this.client.documentationSystem.create({
      data: {
        id: systemId,
        name: systemData.name,
        description: systemData.description ?? null,
        type: systemData.type,
        url: systemData.url ?? null,
        status: systemData.status ?? "unknown",
        lastChecked: systemData.last_checked
          ? new Date(systemData.last_checked)
          : now,
        responseTimeMs: systemData.response_time_ms ?? null,
        version: systemData.version ?? null,
        owner: systemData.owner ?? null,
        tags: sanitizeTagsInput(systemData.tags),
        metadata: sanitizeMetadataInput(systemData.metadata),
        icon: systemData.icon ?? null,
        color: systemData.color ?? null,
        host: systemData.host ?? null,
        port: systemData.port ?? null,
        createdBy: systemData.created_by ?? null,
        designatedTimestamp: systemData.designated_timestamp
          ? new Date(systemData.designated_timestamp)
          : now,
        createdAt: systemData.created_at
          ? new Date(systemData.created_at)
          : now,
      },
    });

    return normalizeSystem(system);
  }

  async findById(id) {
    await this.ensureConnected();
    const system = await this.client.documentationSystem.findUnique({
      where: { id },
    });
    return normalizeSystem(system);
  }

  async findAll(filters = {}) {
    await this.ensureConnected();
    const where = buildWhere(filters);

    const take = filters.limit ? Number(filters.limit) : undefined;
    const skip = filters.offset ? Number(filters.offset) : undefined;

    const systems = await this.client.documentationSystem.findMany({
      where,
      orderBy: mapOrderBy(filters.order_by, filters.order_direction),
      take,
      skip,
    });

    return systems.map(normalizeSystem);
  }

  async getAllSystems(filters = {}) {
    return this.findAll(filters);
  }

  async update(id, updateData) {
    await this.ensureConnected();

    const sanitized = sanitizeUpdates(updateData);
    if (Object.keys(sanitized).length === 0) {
      throw new Error("No valid fields to update");
    }

    const data = {
      ...(sanitized.name !== undefined ? { name: sanitized.name } : {}),
      ...(sanitized.description !== undefined
        ? { description: sanitized.description }
        : {}),
      ...(sanitized.type !== undefined ? { type: sanitized.type } : {}),
      ...(sanitized.url !== undefined ? { url: sanitized.url } : {}),
      ...(sanitized.status !== undefined ? { status: sanitized.status } : {}),
      ...(sanitized.last_checked !== undefined
        ? {
            lastChecked: sanitized.last_checked
              ? new Date(sanitized.last_checked)
              : null,
          }
        : {}),
      ...(sanitized.response_time_ms !== undefined
        ? { responseTimeMs: sanitized.response_time_ms }
        : {}),
      ...(sanitized.version !== undefined
        ? { version: sanitized.version }
        : {}),
      ...(sanitized.owner !== undefined ? { owner: sanitized.owner } : {}),
      ...(sanitized.tags !== undefined
        ? { tags: sanitizeTagsInput(sanitized.tags) }
        : {}),
      ...(sanitized.metadata !== undefined
        ? { metadata: sanitizeMetadataInput(sanitized.metadata) }
        : {}),
      ...(sanitized.icon !== undefined ? { icon: sanitized.icon } : {}),
      ...(sanitized.color !== undefined ? { color: sanitized.color } : {}),
      ...(sanitized.host !== undefined ? { host: sanitized.host } : {}),
      ...(sanitized.port !== undefined ? { port: sanitized.port } : {}),
    };

    const updated = await this.client.documentationSystem.update({
      where: { id },
      data,
    });

    return normalizeSystem(updated);
  }

  async delete(id) {
    await this.ensureConnected();
    await this.client.documentationSystem.delete({
      where: { id },
    });
    return true;
  }

  async findByStatus(status) {
    return this.findAll({ status });
  }

  async findByType(type) {
    return this.findAll({ type });
  }

  async findByOwner(owner) {
    return this.findAll({ owner });
  }

  async search(query) {
    return this.findAll({ search: query });
  }

  async getStatistics() {
    await this.ensureConnected();
    const grouped = await this.client.documentationSystem.groupBy({
      by: ["status", "type"],
      _count: { _all: true },
      _avg: { responseTimeMs: true },
    });

    const stats = {
      total: 0,
      active: 0,
      inactive: 0,
      degraded: 0,
      unknown: 0,
      by_type: {},
      by_owner: {},
      by_status: {},
      avg_response_time: 0,
    };

    let totalResponse = 0;
    let responseCount = 0;

    grouped.forEach((group) => {
      const count = group._count._all;
      const status = group.status || "unknown";
      const type = group.type || "unknown";

      stats.total += count;
      stats.by_status[status] = (stats.by_status[status] || 0) + count;
      stats.by_type[type] = (stats.by_type[type] || 0) + count;

      if (["active", "healthy", "online"].includes(status)) {
        stats.active += count;
      } else if (["inactive", "stopped", "offline"].includes(status)) {
        stats.inactive += count;
      } else if (["degraded", "error"].includes(status)) {
        stats.degraded += count;
      } else {
        stats.unknown += count;
      }

      if (group._avg.responseTimeMs) {
        totalResponse += group._avg.responseTimeMs * count;
        responseCount += count;
      }
    });

    if (responseCount > 0) {
      stats.avg_response_time = Math.round(totalResponse / responseCount);
    }

    return stats;
  }
}

export function createPostgresSystemsRepository() {
  logger.info("Using PostgreSQL repository for documentation systems");
  return new PostgresSystemsRepository();
}
