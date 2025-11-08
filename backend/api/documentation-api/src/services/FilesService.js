import FilesRepository from "../repositories/FilesRepository.js";
import SystemsRepository from "../repositories/SystemsRepository.js";
import IdeasRepository from "../repositories/IdeasRepository.js";
import { logger } from "../config/logger.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FilesService {
  constructor() {
    this.repository = FilesRepository;
    this.systemsRepository = SystemsRepository;
    this.ideasRepository = IdeasRepository;
    this.uploadDir = path.join(__dirname, "../../../uploads");
  }

  /**
   * Initialize upload directory
   */
  async initializeUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      logger.info("Upload directory initialized", { path: this.uploadDir });
    } catch (error) {
      logger.error("Failed to create upload directory", {
        error: error.message,
        path: this.uploadDir,
      });
      throw error;
    }
  }

  /**
   * Handle file upload and create database record
   */
  async uploadFile(fileData, fileBuffer, userId) {
    try {
      await this.initializeUploadDir();

      const { originalname, mimetype, size } = fileData;

      // Generate unique filename
      const fileExtension = path.extname(originalname);
      const baseName = path.basename(originalname, fileExtension);
      const timestamp = Date.now();
      const filename = `${baseName}_${timestamp}${fileExtension}`;

      // Create file path
      const filePath = path.join(this.uploadDir, filename);

      // Write file to disk
      await fs.writeFile(filePath, fileBuffer);

      // Prepare database record
      const recordData = {
        filename: path.basename(filePath),
        original_name: originalname,
        mime_type: mimetype,
        size_bytes: size,
        file_path: filePath,
        system_id: fileData.system_id || null,
        idea_id: fileData.idea_id || null,
        description: fileData.description || null,
        uploaded_by: userId,
        is_public: fileData.is_public || false,
      };

      // Validate related entities if provided
      if (recordData.system_id) {
        const system = await this.systemsRepository.findById(
          recordData.system_id,
        );
        if (!system) {
          // Clean up uploaded file if system doesn't exist
          await fs.unlink(filePath);
          throw new Error(`System with ID ${recordData.system_id} not found`);
        }
      }

      if (recordData.idea_id) {
        const idea = await this.ideasRepository.findById(recordData.idea_id);
        if (!idea) {
          // Clean up uploaded file if idea doesn't exist
          await fs.unlink(filePath);
          throw new Error(`Idea with ID ${recordData.idea_id} not found`);
        }
      }

      // Create database record
      const fileRecord = await this.repository.create(recordData);

      logger.info("File uploaded successfully", {
        id: fileRecord.id,
        filename: originalname,
        size: size,
        uploaded_by: userId,
      });

      return fileRecord;
    } catch (error) {
      logger.error("Failed to upload file", {
        error: error.message,
        filename: fileData?.originalname,
        uploaded_by: userId,
      });
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFile(id) {
    try {
      const fileRecord = await this.repository.findById(id);

      if (!fileRecord) {
        throw new Error("File not found");
      }

      // Check if file exists on disk
      try {
        await fs.access(fileRecord.file_path);
      } catch (_error) {
        logger.warn("File not found on disk", {
          id,
          filename: fileRecord.filename,
          expected_path: fileRecord.file_path,
        });
        throw new Error("File not found on disk");
      }

      return fileRecord;
    } catch (error) {
      logger.error("Failed to get file", {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * Download file and increment download count
   */
  async downloadFile(id) {
    try {
      const fileRecord = await this.getFile(id);

      // Read file content
      const fileContent = await fs.readFile(fileRecord.file_path);

      // Increment download count
      await this.repository.incrementDownloadCount(id);

      logger.info("File downloaded", {
        id,
        filename: fileRecord.original_name,
        size: fileContent.length,
      });

      return {
        content: fileContent,
        filename: fileRecord.original_name,
        mime_type: fileRecord.mime_type,
      };
    } catch (error) {
      logger.error("Failed to download file", {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * List files with filtering
   */
  async listFiles(filters = {}) {
    try {
      return await this.repository.findAll(filters);
    } catch (error) {
      logger.error("Failed to list files", {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Update file metadata
   */
  async updateFile(id, updateData, userId) {
    try {
      const existingFile = await this.repository.findById(id);
      if (!existingFile) {
        throw new Error("File not found");
      }

      // Validate related entities if provided
      if (updateData.system_id) {
        const system = await this.systemsRepository.findById(
          updateData.system_id,
        );
        if (!system) {
          throw new Error(`System with ID ${updateData.system_id} not found`);
        }
      }

      if (updateData.idea_id) {
        const idea = await this.ideasRepository.findById(updateData.idea_id);
        if (!idea) {
          throw new Error(`Idea with ID ${updateData.idea_id} not found`);
        }
      }

      const updatedFile = await this.repository.update(id, updateData);

      logger.info("File metadata updated", {
        id,
        fields: Object.keys(updateData),
        updated_by: userId,
      });

      return updatedFile;
    } catch (error) {
      logger.error("Failed to update file", {
        error: error.message,
        id,
        updateData,
      });
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(id, userId) {
    try {
      const fileRecord = await this.repository.findById(id);
      if (!fileRecord) {
        throw new Error("File not found");
      }

      // Delete file from disk
      try {
        await fs.unlink(fileRecord.file_path);
      } catch (error) {
        logger.warn("Failed to delete file from disk", {
          error: error.message,
          id,
          path: fileRecord.file_path,
        });
      }

      // Delete database record
      await this.repository.delete(id);

      logger.info("File deleted", {
        id,
        filename: fileRecord.original_name,
        deleted_by: userId,
      });

      return true;
    } catch (error) {
      logger.error("Failed to delete file", {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * Get files for a specific idea
   */
  async getFilesForIdea(ideaId) {
    try {
      // Verify idea exists
      const idea = await this.ideasRepository.findById(ideaId);
      if (!idea) {
        throw new Error(`Idea with ID ${ideaId} not found`);
      }

      return await this.repository.findByIdea(ideaId);
    } catch (error) {
      logger.error("Failed to get files for idea", {
        error: error.message,
        ideaId,
      });
      throw error;
    }
  }

  /**
   * Get files for a specific system
   */
  async getFilesForSystem(systemId) {
    try {
      // Verify system exists
      const system = await this.systemsRepository.findById(systemId);
      if (!system) {
        throw new Error(`System with ID ${systemId} not found`);
      }

      return await this.repository.findBySystem(systemId);
    } catch (error) {
      logger.error("Failed to get files for system", {
        error: error.message,
        systemId,
      });
      throw error;
    }
  }

  /**
   * Search files
   */
  async searchFiles(query) {
    try {
      return await this.repository.search(query);
    } catch (error) {
      logger.error("Failed to search files", {
        error: error.message,
        query,
      });
      throw error;
    }
  }

  /**
   * Get file statistics
   */
  async getFileStatistics() {
    try {
      return await this.repository.getStatistics();
    } catch (error) {
      logger.error("Failed to get file statistics", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(fileData) {
    const { originalname, mimetype, size } = fileData;

    // Check file size (default 50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (size > maxSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
      );
    }

    // Check file extension
    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".txt",
      ".md",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".svg",
      ".json",
      ".yaml",
      ".yml",
      ".xml",
      ".csv",
      ".zip",
    ];
    const fileExtension = path.extname(originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error(
        `File type ${fileExtension} not allowed. Allowed types: ${allowedExtensions.join(", ")}`,
      );
    }

    // Check MIME type
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/svg+xml",
      "application/json",
      "application/x-yaml",
      "text/yaml",
      "application/xml",
      "text/xml",
      "text/csv",
      "application/zip",
    ];

    if (!allowedMimeTypes.includes(mimetype)) {
      throw new Error(`MIME type ${mimetype} not allowed`);
    }

    return true;
  }

  /**
   * Get upload directory info
   */
  async getUploadInfo() {
    try {
      const stats = await fs.stat(this.uploadDir);
      return {
        directory: this.uploadDir,
        exists: true,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      return {
        directory: this.uploadDir,
        exists: false,
        error: error.message,
      };
    }
  }
}

export default new FilesService();
