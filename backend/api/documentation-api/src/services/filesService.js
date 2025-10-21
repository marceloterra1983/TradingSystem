import fs from 'fs/promises';
import path from 'path';
import { filesRepository } from '../repositories/filesRepository.js';
import { ideasRepository } from '../repositories/ideasRepository.js';
import { UPLOAD_CONFIG } from '../middleware/upload.js';

/**
 * Service for file management operations
 */
export const filesService = {
  /**
   * Get all files for an idea
   * @param {string} ideaId - Idea ID
   * @returns {Promise<Object>} Response with files
   */
  async getFilesByIdeaId(ideaId) {
    try {
      // Verify idea exists
      const idea = await ideasRepository.findById(ideaId);
      if (!idea) {
        return {
          success: false,
          error: 'Idea not found'
        };
      }

      const files = await filesRepository.findByIdeaId(ideaId);
      const totalSize = await filesRepository.getTotalSizeByIdeaId(ideaId);

      return {
        success: true,
        count: files.length,
        total_size: totalSize,
        data: files
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get file by ID
   * @param {string} id - File ID
   * @returns {Promise<Object>} Response with file metadata
   */
  async getFileById(id) {
    try {
      const file = await filesRepository.findById(id);

      if (!file) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      // Check if file exists on filesystem
      try {
        await fs.access(file.storage_path);
      } catch (err) {
        return {
          success: false,
          error: 'File metadata exists but file is missing from filesystem'
        };
      }

      return {
        success: true,
        data: file
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Upload file(s) for an idea
   * @param {string} ideaId - Idea ID
   * @param {Array} files - Multer file objects
   * @param {string} uploadedBy - User who uploaded
   * @returns {Promise<Object>} Response with uploaded file metadata
   */
  async uploadFiles(ideaId, files, uploadedBy = null) {
    try {
      // Verify idea exists
      const idea = await ideasRepository.findById(ideaId);
      if (!idea) {
        // Clean up uploaded files
        for (const file of files) {
          try {
            await fs.unlink(file.path);
          } catch (err) {
            // Ignore cleanup errors
          }
        }

        return {
          success: false,
          error: 'Idea not found'
        };
      }

      // Create file records
      const fileRecords = [];

      for (const file of files) {
        const fileData = {
          idea_id: ideaId,
          original_name: file.originalname,
          stored_name: file.filename,
          storage_path: file.path,
          size: file.size,
          mime_type: file.mimetype,
          uploaded_by: uploadedBy
        };

        const record = await filesRepository.create(fileData);
        fileRecords.push(record);
      }

      return {
        success: true,
        count: fileRecords.length,
        data: fileRecords
      };
    } catch (error) {
      // Clean up uploaded files on error
      for (const file of files) {
        try {
          await fs.unlink(file.path);
        } catch (err) {
          // Ignore cleanup errors
        }
      }

      throw error;
    }
  },

  /**
   * Delete file
   * @param {string} id - File ID
   * @returns {Promise<Object>} Response with success status
   */
  async deleteFile(id) {
    try {
      const file = await filesRepository.findById(id);

      if (!file) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      // Delete from filesystem
      try {
        await fs.unlink(file.storage_path);
      } catch (err) {
        // Continue even if file doesn't exist on filesystem
        console.warn(`File not found on filesystem: ${file.storage_path}`);
      }

      // Delete from database
      await filesRepository.delete(id);

      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get file statistics
   * @returns {Promise<Object>} Response with statistics
   */
  async getFileStatistics() {
    try {
      const allFiles = await filesRepository.findAll();

      // Calculate statistics
      const totalFiles = allFiles.length;
      const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);

      // Group by file type
      const byFileType = {};
      for (const file of allFiles) {
        const type = file.mime_type || 'unknown';
        if (!byFileType[type]) {
          byFileType[type] = { count: 0, total_size: 0 };
        }
        byFileType[type].count++;
        byFileType[type].total_size += file.size || 0;
      }

      // Group by idea
      const byIdea = {};
      for (const file of allFiles) {
        const ideaId = file.idea_id;
        if (!byIdea[ideaId]) {
          byIdea[ideaId] = { count: 0, total_size: 0 };
        }
        byIdea[ideaId].count++;
        byIdea[ideaId].total_size += file.size || 0;
      }

      return {
        success: true,
        data: {
          total_files: totalFiles,
          total_size: totalSize,
          by_file_type: byFileType,
          by_idea: byIdea,
          average_file_size: totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0
        }
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Validate file for download
   * @param {string} id - File ID
   * @returns {Promise<Object>} File metadata and path for download
   */
  async validateFileForDownload(id) {
    try {
      const file = await filesRepository.findById(id);

      if (!file) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      // Verify file exists on filesystem
      try {
        await fs.access(file.storage_path);
      } catch (err) {
        return {
          success: false,
          error: 'File not found on filesystem'
        };
      }

      return {
        success: true,
        data: file
      };
    } catch (error) {
      throw error;
    }
  }
};
