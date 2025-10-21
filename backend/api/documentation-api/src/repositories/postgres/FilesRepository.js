import { randomUUID } from 'crypto';
import { ensurePrismaConnection, getPrismaClient } from '../../utils/prismaClient.js';
import { logger } from '../../config/logger.js';

const ORDERABLE_FIELDS = new Map([
  ['created_at', 'createdAt'],
  ['updated_at', 'updatedAt'],
  ['size_bytes', 'sizeBytes'],
  ['download_count', 'downloadCount'],
  ['original_name', 'originalName']
]);

function normalizeFile(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    filename: record.filename,
    original_name: record.originalName,
    mime_type: record.mimeType,
    size_bytes: Number(record.sizeBytes),
    file_path: record.filePath,
    description: record.description,
    idea_id: record.ideaId ?? null,
    system_id: record.systemId ?? null,
    uploaded_by: record.uploadedBy ?? null,
    is_public: record.isPublic,
    download_count: record.downloadCount,
    checksum: record.checksum ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    designated_timestamp: record.designatedTimestamp ?? null
  };
}

function mapOrderBy(orderBy = 'created_at', orderDirection = 'DESC') {
  const field = ORDERABLE_FIELDS.get(orderBy.toLowerCase()) ?? 'createdAt';
  const direction = orderDirection?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { [field]: direction };
}

function buildWhere(filters = {}) {
  const where = {};

  if (filters.id) {
    where.id = filters.id;
  }

  if (filters.idea_id) {
    where.ideaId = filters.idea_id;
  }

  if (filters.system_id) {
    where.systemId = filters.system_id;
  }

  if (filters.uploaded_by) {
    where.uploadedBy = filters.uploaded_by;
  }

  if (filters.mime_type) {
    where.mimeType = filters.mime_type;
  }

  if (filters.is_public !== undefined) {
    where.isPublic = Boolean(filters.is_public);
  }

  if (filters.min_size || filters.max_size) {
    where.sizeBytes = {};
    if (filters.min_size) {
      where.sizeBytes.gte = BigInt(filters.min_size);
    }
    if (filters.max_size) {
      where.sizeBytes.lte = BigInt(filters.max_size);
    }
  }

  if (filters.created_from || filters.created_to) {
    where.createdAt = {};
    if (filters.created_from) {
      where.createdAt.gte = new Date(filters.created_from);
    }
    if (filters.created_to) {
      where.createdAt.lte = new Date(filters.created_to);
    }
  }

  if (filters.search) {
    where.OR = [
      { originalName: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  return where;
}

class PostgresFilesRepository {
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

  async create(fileData) {
    await this.ensureConnected();
    const now = new Date();

    const fileId = fileData.id || randomUUID();
    const resolvedSize =
      fileData.size_bytes !== undefined && fileData.size_bytes !== null
        ? fileData.size_bytes
        : fileData.size !== undefined && fileData.size !== null
          ? fileData.size
          : 0;

    const record = await this.client.documentationFile.create({
      data: {
        id: fileId,
        filename: fileData.filename,
        originalName: fileData.original_name,
        mimeType: fileData.mime_type,
        sizeBytes: BigInt(resolvedSize),
        filePath: fileData.file_path,
        description: fileData.description ?? null,
        ideaId: fileData.idea_id ?? null,
        systemId: fileData.system_id ?? null,
        uploadedBy: fileData.uploaded_by ?? null,
        isPublic: fileData.is_public ?? false,
        downloadCount: fileData.download_count ?? 0,
        checksum: fileData.checksum ?? null,
        createdAt: fileData.created_at ? new Date(fileData.created_at) : now,
        designatedTimestamp: fileData.designated_timestamp ? new Date(fileData.designated_timestamp) : now
      }
    });

    return normalizeFile(record);
  }

  async findById(id) {
    await this.ensureConnected();
    const record = await this.client.documentationFile.findUnique({
      where: { id }
    });
    return normalizeFile(record);
  }

  async findAll(filters = {}) {
    await this.ensureConnected();
    const where = buildWhere(filters);
    const take = filters.limit ? Number(filters.limit) : undefined;
    const skip = filters.offset ? Number(filters.offset) : undefined;

    const records = await this.client.documentationFile.findMany({
      where,
      orderBy: mapOrderBy(filters.order_by, filters.order_direction),
      take,
      skip
    });

    return records.map(normalizeFile);
  }

  async update(id, updateData) {
    await this.ensureConnected();
    const data = {};

    if (updateData.description !== undefined) {
      data.description = updateData.description;
    }
    if (updateData.idea_id !== undefined) {
      data.ideaId = updateData.idea_id;
    }
    if (updateData.system_id !== undefined) {
      data.systemId = updateData.system_id;
    }
    if (updateData.is_public !== undefined) {
      data.isPublic = Boolean(updateData.is_public);
    }
    if (updateData.download_count !== undefined) {
      data.downloadCount = Number(updateData.download_count);
    }

    if (Object.keys(data).length === 0) {
      throw new Error('No valid fields to update');
    }

    const record = await this.client.documentationFile.update({
      where: { id },
      data
    });

    return normalizeFile(record);
  }

  async delete(id) {
    await this.ensureConnected();
    await this.client.documentationFile.delete({
      where: { id }
    });
    return true;
  }

  async incrementDownloadCount(id) {
    await this.ensureConnected();
    await this.client.documentationFile.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1
        }
      }
    });
    return true;
  }

  async findByIdea(ideaId) {
    return this.findAll({ idea_id: ideaId, order_by: 'created_at', order_direction: 'ASC' });
  }

  async findBySystem(systemId) {
    return this.findAll({ system_id: systemId, order_by: 'created_at', order_direction: 'ASC' });
  }

  async findByUploader(uploader) {
    return this.findAll({ uploaded_by: uploader, order_by: 'created_at', order_direction: 'DESC' });
  }

  async findByMimeType(mimeType) {
    return this.findAll({ mime_type: mimeType });
  }

  async findPublic() {
    return this.findAll({ is_public: true, order_by: 'download_count', order_direction: 'DESC' });
  }

  async search(query) {
    return this.findAll({ search: query });
  }

  async findLargeFiles(thresholdBytes = 10 * 1024 * 1024) {
    return this.findAll({
      min_size: thresholdBytes,
      order_by: 'size_bytes',
      order_direction: 'DESC'
    });
  }

  async getStatistics() {
    await this.ensureConnected();

    const totals = await this.client.documentationFile.aggregate({
      _count: { _all: true },
      _sum: { sizeBytes: true, downloadCount: true }
    });

    const grouped = await this.client.documentationFile.findMany({
      select: {
        mimeType: true,
        uploadedBy: true,
        isPublic: true,
        sizeBytes: true,
        downloadCount: true
      }
    });

    const stats = {
      total: totals._count?._all ?? 0,
      total_size: Number(totals._sum?.sizeBytes ?? 0n),
      total_downloads: totals._sum?.downloadCount ?? 0,
      by_mime_type: {},
      by_uploader: {},
      by_visibility: {
        public: { count: 0, size: 0 },
        private: { count: 0, size: 0 }
      },
      size_distribution: {
        small: 0,
        medium: 0,
        large: 0,
        xlarge: 0
      }
    };

    grouped.forEach((item) => {
      const mime = item.mimeType || 'unknown';
      const uploader = item.uploadedBy || 'unknown';
      const visibility = item.isPublic ? 'public' : 'private';
      const size = Number(item.sizeBytes ?? 0n);

      stats.by_mime_type[mime] = (stats.by_mime_type[mime] || 0) + 1;
      stats.by_uploader[uploader] = (stats.by_uploader[uploader] || 0) + 1;
      stats.by_visibility[visibility].count += 1;
      stats.by_visibility[visibility].size += size;

      if (size < 1024 * 1024) {
        stats.size_distribution.small += 1;
      } else if (size < 10 * 1024 * 1024) {
        stats.size_distribution.medium += 1;
      } else if (size < 100 * 1024 * 1024) {
        stats.size_distribution.large += 1;
      } else {
        stats.size_distribution.xlarge += 1;
      }
    });

    stats.total_size_bytes = stats.total_size;
    return stats;
  }
}

export function createPostgresFilesRepository() {
  logger.info('Using PostgreSQL repository for documentation files');
  return new PostgresFilesRepository();
}
