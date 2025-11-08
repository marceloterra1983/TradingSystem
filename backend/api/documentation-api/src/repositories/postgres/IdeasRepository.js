import {
  ensurePrismaConnection,
  getPrismaClient,
} from "../../utils/prismaClient.js";
import { logger } from "../../config/logger.js";

const STATUS_ORDER_FIELDS = new Set([
  "updated_at",
  "created_at",
  "priority",
  "due_date",
  "title",
]);

function normalizeIdea(record) {
  if (!record) {
    return null;
  }

  const tags = Array.isArray(record.tags)
    ? record.tags
    : record.tags
      ? typeof record.tags === "string"
        ? JSON.parse(record.tags)
        : []
      : [];

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    status: record.status,
    category: record.category,
    priority: record.priority,
    assigned_to: record.assignedTo ?? null,
    created_by: record.createdBy,
    system_id: record.systemId ?? null,
    tags,
    estimated_hours: record.estimatedHours ?? null,
    actual_hours: record.actualHours ?? null,
    due_date: record.dueDate ?? null,
    completed_at: record.completedAt ?? null,
    designated_timestamp: record.designatedTimestamp ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function sanitizeUpdates(updates = {}) {
  const allowed = new Set([
    "title",
    "description",
    "status",
    "category",
    "priority",
    "assigned_to",
    "system_id",
    "tags",
    "estimated_hours",
    "actual_hours",
    "due_date",
    "completed_at",
  ]);

  return Object.fromEntries(
    Object.entries(updates)
      .filter(([key, value]) => allowed.has(key) && value !== undefined)
      .map(([key, value]) => {
        if (key === "tags" && Array.isArray(value)) {
          return [key, Array.from(new Set(value))];
        }
        return [key, value];
      }),
  );
}

function mapOrderBy(orderBy = "updated_at", orderDirection = "DESC") {
  const normalizedField = orderBy.toLowerCase();
  if (!STATUS_ORDER_FIELDS.has(normalizedField)) {
    return { updatedAt: "desc" };
  }

  const prismaField = {
    updated_at: "updatedAt",
    created_at: "createdAt",
    priority: "priority",
    due_date: "dueDate",
    title: "title",
  }[normalizedField];

  const direction = orderDirection?.toLowerCase() === "asc" ? "asc" : "desc";

  return { [prismaField]: direction };
}

function buildFilters(filters = {}) {
  const where = {};

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status };
    } else {
      where.status = filters.status;
    }
  }

  if (filters.category) {
    if (Array.isArray(filters.category)) {
      where.category = { in: filters.category };
    } else {
      where.category = filters.category;
    }
  }

  if (filters.priority) {
    if (Array.isArray(filters.priority)) {
      where.priority = { in: filters.priority };
    } else {
      where.priority = filters.priority;
    }
  }

  if (filters.assigned_to) {
    if (Array.isArray(filters.assigned_to)) {
      where.assignedTo = { in: filters.assigned_to };
    } else {
      where.assignedTo = filters.assigned_to;
    }
  }

  if (filters.created_by) {
    where.createdBy = filters.created_by;
  }

  if (filters.system_id) {
    where.systemId = filters.system_id;
  }

  if (filters.due_date_from || filters.due_date_to) {
    where.dueDate = {};
    if (filters.due_date_from) {
      where.dueDate.gte = new Date(filters.due_date_from);
    }
    if (filters.due_date_to) {
      where.dueDate.lte = new Date(filters.due_date_to);
    }
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

class PostgresIdeasRepository {
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

  async create(data) {
    await this.ensureConnected();
    const now = new Date();
    const payload = {
      title: data.title,
      description: data.description ?? null,
      status: data.status || "backlog",
      category: data.category,
      priority: data.priority || "medium",
      assignedTo: data.assigned_to ?? data.assignedTo ?? null,
      createdBy: data.created_by ?? data.createdBy,
      systemId: data.system_id ?? data.systemId ?? null,
      tags: Array.isArray(data.tags) ? Array.from(new Set(data.tags)) : [],
      estimatedHours: data.estimated_hours ?? data.estimatedHours ?? null,
      actualHours: data.actual_hours ?? data.actualHours ?? null,
      dueDate: data.due_date ? new Date(data.due_date) : null,
      completedAt: data.completed_at ? new Date(data.completed_at) : null,
      designatedTimestamp: data.designated_timestamp
        ? new Date(data.designated_timestamp)
        : now,
      createdAt: data.created_at ? new Date(data.created_at) : now,
    };

    const idea = await this.client.documentationIdea.create({
      data: payload,
    });

    return normalizeIdea(idea);
  }

  async findById(id) {
    await this.ensureConnected();
    const idea = await this.client.documentationIdea.findUnique({
      where: { id },
    });
    return normalizeIdea(idea);
  }

  async findAll(filters = {}) {
    await this.ensureConnected();
    const where = buildFilters(filters);

    const take = filters.limit ? Number(filters.limit) : undefined;
    const skip = filters.offset ? Number(filters.offset) : undefined;

    const ideas = await this.client.documentationIdea.findMany({
      where,
      orderBy: mapOrderBy(filters.order_by, filters.order_direction),
      take,
      skip,
    });

    return ideas.map(normalizeIdea);
  }

  async update(id, updates) {
    await this.ensureConnected();
    const sanitized = sanitizeUpdates(updates);

    if (Object.keys(sanitized).length === 0) {
      throw new Error("No valid fields to update");
    }

    const data = {
      ...(sanitized.title !== undefined ? { title: sanitized.title } : {}),
      ...(sanitized.description !== undefined
        ? { description: sanitized.description }
        : {}),
      ...(sanitized.status !== undefined ? { status: sanitized.status } : {}),
      ...(sanitized.category !== undefined
        ? { category: sanitized.category }
        : {}),
      ...(sanitized.priority !== undefined
        ? { priority: sanitized.priority }
        : {}),
      ...(sanitized.assigned_to !== undefined
        ? { assignedTo: sanitized.assigned_to }
        : {}),
      ...(sanitized.system_id !== undefined
        ? { systemId: sanitized.system_id }
        : {}),
      ...(sanitized.tags !== undefined ? { tags: sanitized.tags ?? [] } : {}),
      ...(sanitized.estimated_hours !== undefined
        ? { estimatedHours: sanitized.estimated_hours }
        : {}),
      ...(sanitized.actual_hours !== undefined
        ? { actualHours: sanitized.actual_hours }
        : {}),
      ...(sanitized.due_date !== undefined
        ? { dueDate: sanitized.due_date ? new Date(sanitized.due_date) : null }
        : {}),
      ...(sanitized.completed_at !== undefined
        ? {
            completedAt: sanitized.completed_at
              ? new Date(sanitized.completed_at)
              : null,
          }
        : {}),
    };

    if (sanitized.status === "done" && sanitized.completed_at === undefined) {
      data.completedAt = new Date();
    }

    const updated = await this.client.documentationIdea.update({
      where: { id },
      data,
    });

    return normalizeIdea(updated);
  }

  async delete(id) {
    await this.ensureConnected();
    await this.client.documentationIdea.delete({
      where: { id },
    });
    return true;
  }

  async findByStatus(status) {
    return this.findAll({
      status,
      order_by: "priority",
      order_direction: "DESC",
    });
  }

  async findByCategory(category) {
    return this.findAll({ category });
  }

  async findByPriority(priority) {
    return this.findAll({ priority });
  }

  async findByAssignee(assignedTo) {
    return this.findAll({ assigned_to: assignedTo });
  }

  async findByCreator(createdBy) {
    return this.findAll({ created_by: createdBy });
  }

  async findBySystem(systemId) {
    return this.findAll({ system_id: systemId });
  }

  async search(query) {
    return this.findAll({ search: query });
  }

  async findOverdue() {
    const now = new Date();
    return this.findAll({
      due_date_to: now.toISOString(),
      status: ["backlog", "todo", "in_progress"],
    });
  }

  async getStatistics() {
    await this.ensureConnected();
    const grouped = await this.client.documentationIdea.groupBy({
      by: ["status", "category", "priority", "assignedTo"],
      _count: { _all: true },
      _avg: {
        estimatedHours: true,
        actualHours: true,
      },
    });

    const stats = {
      total: 0,
      by_status: {},
      by_category: {},
      by_priority: {},
      by_assignee: {},
      hours: {
        total_estimated: 0,
        total_actual: 0,
        completion_rate: 0,
      },
    };

    let totalEstimated = 0;
    let totalActual = 0;
    let completedCount = 0;

    grouped.forEach((group) => {
      const count = group._count._all;
      const status = group.status || "unknown";
      const category = group.category || "uncategorized";
      const priority = group.priority || "unknown";
      const assignee = group.assignedTo || "unassigned";

      stats.total += count;

      stats.by_status[status] = (stats.by_status[status] || 0) + count;
      stats.by_category[category] = (stats.by_category[category] || 0) + count;
      stats.by_priority[priority] = (stats.by_priority[priority] || 0) + count;
      stats.by_assignee[assignee] = (stats.by_assignee[assignee] || 0) + count;

      if (group._avg.estimatedHours) {
        totalEstimated += group._avg.estimatedHours * count;
      }

      if (group._avg.actualHours) {
        totalActual += group._avg.actualHours * count;
      }

      if (status === "done") {
        completedCount += count;
      }
    });

    stats.hours.total_estimated = Math.round(totalEstimated);
    stats.hours.total_actual = Math.round(totalActual);
    stats.hours.completion_rate =
      stats.total > 0 ? Math.round((completedCount / stats.total) * 100) : 0;

    return stats;
  }
}

export function createPostgresIdeasRepository() {
  logger.info("Using PostgreSQL repository for documentation ideas");
  return new PostgresIdeasRepository();
}
