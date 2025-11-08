/**
 * Media Service - Handles media download and storage to MinIO
 */

import axios from 'axios';
import { Client as MinioClient } from 'minio';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import crypto from 'crypto';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import pool from '../db/pool.js';

// Initialize MinIO client
const minioEndpointUrl = new URL(env.MINIO.ENDPOINT);
const minioClient = new MinioClient({
  endPoint: minioEndpointUrl.hostname,
  port: minioEndpointUrl.port ? parseInt(minioEndpointUrl.port) : (minioEndpointUrl.protocol === 'https:' ? 443 : 9000),
  useSSL: minioEndpointUrl.protocol === 'https:',
  accessKey: env.MINIO.ACCESS_KEY,
  secretKey: env.MINIO.SECRET_KEY,
  region: env.MINIO.REGION,
});

// Ensure bucket exists
(async () => {
  try {
    const exists = await minioClient.bucketExists(env.MINIO.BUCKET);
    if (!exists) {
      await minioClient.makeBucket(env.MINIO.BUCKET, env.MINIO.REGION);
      logger.info('MinIO bucket created', { bucket: env.MINIO.BUCKET });
    } else {
      logger.info('MinIO bucket exists', { bucket: env.MINIO.BUCKET });
    }
  } catch (error) {
    logger.error('Failed to check/create MinIO bucket', { error: error.message });
  }
})();

/**
 * Download media from WhatsApp and upload to MinIO
 */
export async function downloadMedia(mediaDownloadId, whatsappCoreUrl, apiKey) {
  const client = await pool.connect();
  
  try {
    // Get media download record
    const downloadRecord = await client.query(
      'SELECT * FROM whatsapp_gateway.media_downloads WHERE id = $1',
      [mediaDownloadId]
    );
    
    if (downloadRecord.rows.length === 0) {
      throw new Error(`Media download record not found: ${mediaDownloadId}`);
    }
    
    const record = downloadRecord.rows[0];
    
    // Mark as downloading
    await client.query(
      `UPDATE whatsapp_gateway.media_downloads
       SET download_status = 'downloading', download_started_at = NOW()
       WHERE id = $1`,
      [mediaDownloadId]
    );
    
    logger.info('Downloading media', {
      media_download_id: mediaDownloadId,
      media_url: record.media_url,
      media_type: record.media_type,
    });
    
    // Download from WhatsApp Core
    const response = await axios.get(record.media_url, {
      responseType: 'arraybuffer',
      headers: {
        'X-Api-Key': apiKey,
      },
      timeout: 30000, // 30s timeout
    });
    
    const buffer = Buffer.from(response.data);
    
    // Validate file type
    const fileType = await fileTypeFromBuffer(buffer);
    const mimeType = fileType?.mime || record.media_mime_type || 'application/octet-stream';
    const ext = fileType?.ext || 'bin';
    
    // Generate file hash
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Generate MinIO key (organized by session/chat/date)
    const date = new Date();
    const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const minioKey = `${record.session_name}/${record.chat_id}/${yearMonth}/${hash}.${ext}`;
    
    // Upload to MinIO
    await minioClient.putObject(env.MINIO.BUCKET, minioKey, buffer, {
      'Content-Type': mimeType,
      'X-Amz-Meta-Session': record.session_name,
      'X-Amz-Meta-Chat': record.chat_id,
      'X-Amz-Meta-Message-Id': record.message_id,
      'X-Amz-Meta-Original-Filename': record.media_filename || 'unknown',
    });
    
    const minioUrl = `${env.MINIO.ENDPOINT}/${env.MINIO.BUCKET}/${minioKey}`;
    
    logger.info('Media uploaded to MinIO', {
      media_download_id: mediaDownloadId,
      minio_key: minioKey,
      file_size: buffer.length,
    });
    
    // Generate thumbnail for images/videos
    let thumbnailKey = null;
    if (record.media_type === 'image' || record.media_type === 'video') {
      try {
        const thumbnailBuffer = await sharp(buffer)
          .resize(200, 200, { fit: 'inside' })
          .jpeg({ quality: 80 })
          .toBuffer();
        
        thumbnailKey = `${record.session_name}/${record.chat_id}/${yearMonth}/thumb_${hash}.jpg`;
        
        await minioClient.putObject(env.MINIO.BUCKET, thumbnailKey, thumbnailBuffer, {
          'Content-Type': 'image/jpeg',
        });
        
        logger.debug('Thumbnail generated', { thumbnail_key: thumbnailKey });
      } catch (thumbError) {
        logger.warn('Failed to generate thumbnail', { error: thumbError.message });
      }
    }
    
    // Update media_downloads record
    await client.query(
      `UPDATE whatsapp_gateway.media_downloads
       SET download_status = 'completed',
           download_completed_at = NOW(),
           minio_bucket = $2,
           minio_key = $3,
           minio_url = $4,
           thumbnail_minio_key = $5,
           file_hash = $6,
           file_size_bytes = $7,
           file_validated = TRUE
       WHERE id = $1`,
      [mediaDownloadId, env.MINIO.BUCKET, minioKey, minioUrl, thumbnailKey, hash, buffer.length]
    );
    
    // Update messages table
    await client.query(
      `UPDATE whatsapp_gateway.messages
       SET media_local_path = $3,
           media_thumbnail_path = $4,
           media_download_status = 'completed'
       WHERE message_id = $1 AND session_name = $2`,
      [record.message_id, record.session_name, minioKey, thumbnailKey]
    );
    
    logger.info('Media download completed', {
      media_download_id: mediaDownloadId,
      message_id: record.message_id,
    });
    
    return {
      minioKey,
      minioUrl,
      thumbnailKey,
      fileHash: hash,
      fileSize: buffer.length,
    };
    
  } catch (error) {
    logger.error('Media download failed', {
      media_download_id: mediaDownloadId,
      error: error.message,
    });
    
    // Schedule retry
    await client.query(
      'SELECT whatsapp_gateway.schedule_media_download_retry($1, $2)',
      [mediaDownloadId, error.message]
    );
    
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get pending media downloads
 */
export async function getPendingMediaDownloads(limit = 10) {
  const query = `
    SELECT id, message_id, session_name, media_url, media_type
    FROM whatsapp_gateway.media_downloads
    WHERE download_status = 'pending'
       OR (download_status = 'failed' 
           AND retry_count < max_retries 
           AND next_retry_at <= NOW())
    ORDER BY created_at ASC
    LIMIT $1
  `;
  
  const result = await pool.query(query, [limit]);
  return result.rows;
}

/**
 * Get media URL from MinIO (presigned for temporary access)
 */
export async function getMediaUrl(minioKey, expirySeconds = 3600) {
  try {
    const url = await minioClient.presignedGetObject(
      env.MINIO.BUCKET,
      minioKey,
      expirySeconds
    );
    return url;
  } catch (error) {
    logger.error('Failed to generate presigned URL', {
      minio_key: minioKey,
      error: error.message,
    });
    throw error;
  }
}

