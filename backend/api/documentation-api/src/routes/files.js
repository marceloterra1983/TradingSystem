import express from 'express';
import FilesService from '../services/FilesService.js';
import { validation, handleValidationErrors } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/v1/files/upload
 * Upload single file
 */
router.post(
  '/upload',
  upload.single('file'),
  handleUploadError,
  asyncHandler(async (req, res) => {
    const { system_id, idea_id, description, is_public } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Validate file
    FilesService.validateFile(req.file);

    // Prepare file data
    const fileData = {
      system_id: system_id || null,
      idea_id: idea_id || null,
      description: description || null,
      is_public: is_public === 'true' || is_public === true
    };

    // Read file buffer
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(req.file.path);

    try {
      const fileRecord = await FilesService.uploadFile(fileData, fileBuffer, userId);

      res.status(201).json({
        success: true,
        data: fileRecord,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      // Clean up uploaded file if database operation fails
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error('Failed to clean up file after error', {
          error: cleanupError.message,
          path: req.file.path
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/v1/files/upload-multiple
 * Upload multiple files
 */
router.post(
  '/upload-multiple',
  upload.array('files', 5),
  handleUploadError,
  asyncHandler(async (req, res) => {
    const { system_id, idea_id, description, is_public } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const fs = await import('fs');
    const uploadedFiles = [];
    const errors = [];

    // Process each file
    for (const [index, file] of req.files.entries()) {
      try {
        // Validate file
        FilesService.validateFile(file);

        // Prepare file data
        const fileData = {
          system_id: system_id || null,
          idea_id: idea_id || null,
          description: description || null,
          is_public: is_public === 'true' || is_public === true
        };

        // Read file buffer
        const fileBuffer = fs.readFileSync(file.path);

        // Upload file
        const fileRecord = await FilesService.uploadFile(fileData, fileBuffer, userId);
        uploadedFiles.push(fileRecord);

      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });

        // Clean up failed file
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          logger.error('Failed to clean up file after error', {
            error: cleanupError.message,
            path: file.path
          });
        }
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files were uploaded successfully',
        details: errors
      });
    }

    const statusCode = errors.length > 0 ? 207 : 201; // 207 Multi-Status if some errors

    res.status(statusCode).json({
      success: true,
      data: uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      errors: errors.length > 0 ? errors : undefined
    });
  })
);

/**
 * GET /api/v1/files
 * List all files with filtering
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = {
      system_id: req.query.system_id,
      idea_id: req.query.idea_id,
      uploaded_by: req.query.uploaded_by,
      mime_type: req.query.mime_type,
      search: req.query.search,
      is_public: req.query.is_public,
      min_size: req.query.min_size ? parseInt(req.query.min_size) : undefined,
      max_size: req.query.max_size ? parseInt(req.query.max_size) : undefined,
      created_from: req.query.created_from,
      created_to: req.query.created_to,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      order_by: req.query.order_by || 'created_at',
      order_direction: req.query.order_direction || 'DESC'
    };

    const result = await FilesService.listFiles(filters);

    res.json({
      success: true,
      data: result,
      pagination: {
        total: result.length,
        limit: filters.limit,
        offset: filters.offset
      }
    });
  })
);

/**
 * GET /api/v1/files/:id
 * Get file metadata by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const file = await FilesService.getFile(req.params.id);

    res.json({
      success: true,
      data: file
    });
  })
);

/**
 * GET /api/v1/files/:id/download
 * Download file
 */
router.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const { content, filename, mime_type } = await FilesService.downloadFile(req.params.id);

    res.set({
      'Content-Type': mime_type,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    });

    res.send(content);
  })
);

/**
 * PUT /api/v1/files/:id
 * Update file metadata
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const updatedFile = await FilesService.updateFile(req.params.id, req.body, userId);

    res.json({
      success: true,
      data: updatedFile,
      message: 'File metadata updated successfully'
    });
  })
);

/**
 * DELETE /api/v1/files/:id
 * Delete file
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    await FilesService.deleteFile(req.params.id, userId);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  })
);

/**
 * GET /api/v1/files/idea/:ideaId
 * Get files for a specific idea
 */
router.get(
  '/idea/:ideaId',
  asyncHandler(async (req, res) => {
    const files = await FilesService.getFilesForIdea(req.params.ideaId);

    res.json({
      success: true,
      data: files,
      count: files.length
    });
  })
);

/**
 * GET /api/v1/files/system/:systemId
 * Get files for a specific system
 */
router.get(
  '/system/:systemId',
  asyncHandler(async (req, res) => {
    const files = await FilesService.getFilesForSystem(req.params.systemId);

    res.json({
      success: true,
      data: files,
      count: files.length
    });
  })
);

/**
 * GET /api/v1/files/search
 * Search files
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { q: query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    const files = await FilesService.searchFiles(query.trim());

    res.json({
      success: true,
      data: files,
      count: files.length,
      query: query.trim()
    });
  })
);

/**
 * GET /api/v1/files/statistics
 * Get file statistics
 */
router.get(
  '/statistics',
  asyncHandler(async (req, res) => {
    const stats = await FilesService.getFileStatistics();

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * GET /api/v1/files/upload-info
 * Get upload configuration and directory info
 */
router.get(
  '/upload-info',
  asyncHandler(async (req, res) => {
    const uploadInfo = await FilesService.getUploadInfo();

    res.json({
      success: true,
      data: {
        ...uploadInfo,
        max_file_size: 50 * 1024 * 1024, // 50MB
        allowed_extensions: [
          '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
          '.txt', '.md', '.markdown',
          '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
          '.json', '.xml', '.csv',
          '.yaml', '.yml',
          '.zip', '.rar'
        ],
        max_files_per_request: 5
      }
    });
  })
);

export default router;
