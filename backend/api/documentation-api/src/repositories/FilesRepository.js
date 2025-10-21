import questDBClient from '../utils/questDBClient.js';
import { logger } from '../config/logger.js';
import { config } from '../config/appConfig.js';
import { createPostgresFilesRepository } from './postgres/FilesRepository.js';

/**
 * Repository for managing documentation files in QuestDB
 */
export class FilesRepository {
  constructor() {
    this.tableName = 'documentation_files';
  }

  /**
   * Create a new file record
   */
  async create(fileData) {
    try {
      const id = questDBClient.generateUUID();
      const now = questDBClient.getCurrentTimestamp();

      const sql = `
        INSERT INTO ${this.tableName} (
          id, filename, original_name, mime_type, size_bytes,
          file_path, description, idea_id, system_id,
          uploaded_by, is_public, download_count,
          created_at, updated_at, designated_timestamp
        ) VALUES (
          :id, :filename, :original_name, :mime_type, :size_bytes,
          :file_path, :description, :idea_id, :system_id,
          :uploaded_by, :is_public, :download_count,
          :created_at, :updated_at, :designated_timestamp
        )
      `;

      const params = {
        id,
        filename: fileData.filename,
        original_name: fileData.original_name,
        mime_type: fileData.mime_type,
        size_bytes: fileData.size_bytes,
        file_path: fileData.file_path,
        description: fileData.description || null,
        idea_id: fileData.idea_id || null,
        system_id: fileData.system_id || null,
        uploaded_by: fileData.uploaded_by,
        is_public: fileData.is_public || false,
        download_count: fileData.download_count || 0,
        created_at: now,
        updated_at: now,
        designated_timestamp: now
      };

      await questDBClient.executeWrite(sql, params);

      logger.info('Documentation file created', {
        id,
        filename: fileData.filename,
        size: fileData.size_bytes
      });

      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to create documentation file', {
        error: error.message,
        data: fileData
      });
      throw error;
    }
  }

  /**
   * Find file by ID
   */
  async findById(id) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = :id`;
      const rows = await questDBClient.executeSelect(sql, { id });

      if (rows.length === 0) {
        return null;
      }

      return this.transformRow(rows[0]);
    } catch (error) {
      logger.error('Failed to find file by ID', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Get all files with optional filtering
   */
  async findAll(filters = {}) {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      const params = {};

      if (filters.idea_id) {
        sql += ` AND idea_id = :idea_id`;
        params.idea_id = filters.idea_id;
      }

      if (filters.system_id) {
        sql += ` AND system_id = :system_id`;
        params.system_id = filters.system_id;
      }

      if (filters.uploaded_by) {
        sql += ` AND uploaded_by = :uploaded_by`;
        params.uploaded_by = filters.uploaded_by;
      }

      if (filters.mime_type) {
        sql += ` AND mime_type = :mime_type`;
        params.mime_type = filters.mime_type;
      }

      if (filters.is_public !== undefined) {
        sql += ` AND is_public = :is_public`;
        params.is_public = filters.is_public;
      }

      if (filters.search) {
        sql += ` AND (original_name ILIKE '%${filters.search}%' OR description ILIKE '%${filters.search}%')`;
      }

      // Size filters
      if (filters.min_size) {
        sql += ` AND size_bytes >= :min_size`;
        params.min_size = filters.min_size;
      }

      if (filters.max_size) {
        sql += ` AND size_bytes <= :max_size`;
        params.max_size = filters.max_size;
      }

      // Date range filter
      if (filters.created_from) {
        sql += ` AND created_at >= :created_from`;
        params.created_from = filters.created_from;
      }

      if (filters.created_to) {
        sql += ` AND created_at <= :created_to`;
        params.created_to = filters.created_to;
      }

      // Add ordering
      const orderBy = filters.order_by || 'created_at';
      const orderDirection = filters.order_direction || 'DESC';
      sql += ` ORDER BY ${orderBy} ${orderDirection}`;

      // Add pagination
      if (filters.limit) {
        sql += ` LIMIT ${filters.limit}`;
      }

      if (filters.offset) {
        sql += ` OFFSET ${filters.offset}`;
      }

      const rows = await questDBClient.executeSelect(sql, params);
      return rows.map(row => this.transformRow(row));
    } catch (error) {
      logger.error('Failed to find files', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Update file by ID
   */
  async update(id, updateData) {
    try {
      const now = questDBClient.getCurrentTimestamp();

      const fields = [];
      const params = { id, updated_at: now };

      // Build dynamic update query
      const allowedFields = [
        'description', 'idea_id', 'system_id', 'is_public'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          fields.push(`${field} = :${field}`);
          params[field] = updateData[field];
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push('updated_at = :updated_at');

      const sql = `
        UPDATE ${this.tableName}
        SET ${fields.join(', ')}
        WHERE id = :id
      `;

      await questDBClient.executeWrite(sql, params);

      logger.info('Documentation file updated', { id, fields: fields.join(', ') });

      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to update documentation file', {
        error: error.message,
        id,
        updateData
      });
      throw error;
    }
  }

  /**
   * Delete file by ID
   */
  async delete(id) {
    try {
      // First check if file exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('File not found');
      }

      const sql = `DELETE FROM ${this.tableName} WHERE id = :id`;
      await questDBClient.executeWrite(sql, { id });

      logger.info('Documentation file deleted', {
        id,
        filename: existing.original_name
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete documentation file', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(id) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET download_count = download_count + 1, updated_at = :updated_at
        WHERE id = :id
      `;

      const params = {
        id,
        updated_at: questDBClient.getCurrentTimestamp()
      };

      await questDBClient.executeWrite(sql, params);

      logger.debug('Download count incremented', { id });

      return true;
    } catch (error) {
      logger.error('Failed to increment download count', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Get files for an idea
   */
  async findByIdea(ideaId) {
    return this.findAll({
      idea_id: ideaId,
      order_by: 'created_at',
      order_direction: 'ASC'
    });
  }

  /**
   * Get files for a system
   */
  async findBySystem(systemId) {
    return this.findAll({
      system_id: systemId,
      order_by: 'created_at',
      order_direction: 'ASC'
    });
  }

  /**
   * Get files uploaded by user
   */
  async findByUploader(uploader) {
    return this.findAll({
      uploaded_by: uploader,
      order_by: 'created_at',
      order_direction: 'DESC'
    });
  }

  /**
   * Get files by MIME type
   */
  async findByMimeType(mimeType) {
    return this.findAll({ mime_type: mimeType });
  }

  /**
   * Get public files
   */
  async findPublic() {
    return this.findAll({
      is_public: true,
      order_by: 'download_count',
      order_direction: 'DESC'
    });
  }

  /**
   * Search files by filename or description
   */
  async search(query) {
    return this.findAll({ search: query });
  }

  /**
   * Get large files (above threshold)
   */
  async findLargeFiles(thresholdBytes = 10 * 1024 * 1024) { // 10MB default
    return this.findAll({
      min_size: thresholdBytes,
      order_by: 'size_bytes',
      order_direction: 'DESC'
    });
  }

  /**
   * Get file statistics
   */
  async getStatistics() {
    try {
      const sql = `
        SELECT
          mime_type,
          uploaded_by,
          is_public,
          COUNT(*) as count,
          SUM(size_bytes) as total_size,
          AVG(size_bytes) as avg_size,
          MAX(download_count) as max_downloads,
          SUM(download_count) as total_downloads
        FROM ${this.tableName}
        GROUP BY mime_type, uploaded_by, is_public
        ORDER BY count DESC
      `;

      const rows = await questDBClient.executeSelect(sql);

      const stats = {
        total: 0,
        total_size: 0,
        total_downloads: 0,
        by_mime_type: {},
        by_uploader: {},
        by_visibility: {
          public: { count: 0, size: 0 },
          private: { count: 0, size: 0 }
        },
        size_distribution: {
          small: 0,    // < 1MB
          medium: 0,   // 1MB - 10MB
          large: 0,    // 10MB - 100MB
          xlarge: 0    // > 100MB
        }
      };

      rows.forEach(row => {
        stats.total += row.count;
        stats.total_size += row.total_size || 0;
        stats.total_downloads += row.total_downloads || 0;

        // Group by MIME type
        if (!stats.by_mime_type[row.mime_type]) {
          stats.by_mime_type[row.mime_type] = 0;
        }
        stats.by_mime_type[row.mime_type] += row.count;

        // Group by uploader
        if (!stats.by_uploader[row.uploaded_by]) {
          stats.by_uploader[row.uploaded_by] = 0;
        }
        stats.by_uploader[row.uploaded_by] += row.count;

        // Group by visibility
        const visibility = row.is_public ? 'public' : 'private';
        stats.by_visibility[visibility].count += row.count;
        stats.by_visibility[visibility].size += row.total_size || 0;

        // Size distribution (based on average size)
        const avgSize = row.avg_size || 0;
        if (avgSize < 1024 * 1024) { // < 1MB
          stats.size_distribution.small += row.count;
        } else if (avgSize < 10 * 1024 * 1024) { // < 10MB
          stats.size_distribution.medium += row.count;
        } else if (avgSize < 100 * 1024 * 1024) { // < 100MB
          stats.size_distribution.large += row.count;
        } else {
          stats.size_distribution.xlarge += row.count;
        }
      });

      stats.total_size_bytes = stats.total_size;

      return stats;
    } catch (error) {
      logger.error('Failed to get file statistics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Transform database row to object with proper type conversion
   */
  transformRow(row) {
    if (!row) return null;

    return {
      ...row,
      size_bytes: parseInt(row.size_bytes),
      download_count: parseInt(row.download_count),
      is_public: Boolean(row.is_public),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      idea_id: row.idea_id || null,
      system_id: row.system_id || null
    };
  }
}

let filesRepositoryInstance = null;

export function getFilesRepository() {
  if (!filesRepositoryInstance) {
    if (config.database.strategy === 'postgres') {
      filesRepositoryInstance = createPostgresFilesRepository();
    } else {
      filesRepositoryInstance = new FilesRepository();
    }
  }
  return filesRepositoryInstance;
}

export default getFilesRepository();
